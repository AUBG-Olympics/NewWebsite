"""Align historical databases with the current ORM without dropping legacy data.

This follows the existing production head. Keep historical revision IDs and
parent links intact; fresh databases and production-shaped databases converge
on the same column types, nullability, defaults and indexes.
"""

from alembic import op
import sqlalchemy as sa

revision = "e8f1a2b3c4d5"
down_revision = "d1e2f3a4b5c6"
branch_labels = None
depends_on = None


# Frozen migration targets; do not import live application models here.
TARGETS = {
    "events": {
        "description": (sa.String(1023), True),
        "date": (sa.DateTime(), True),
        "enable_waitlist": (sa.Boolean(), False),
        "waitlist": (sa.Boolean(), False),
        "waitlist_max_participants": (sa.Integer(), True),
    },
    "form_submissions": {
        "sport": (sa.String(63), False),
        "gender": (sa.String(31), True),
        "teammates": (sa.String(511), True),
        "phone_number": (sa.String(21), False),
    },
    "users": {
        "picture": (sa.String(1023), True),
        "role": (sa.String(31), True),
    },
    "sponsors": {
        "website": (sa.String(1023), True),
        "logo": (sa.String(1023), True),
    },
}


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {
        table: {column["name"]: column for column in inspector.get_columns(table)}
        for table in TARGETS
    }

    # MySQL DDL commits independently. Check every narrowing operation before
    # executing any DDL so long existing values cause a clear failure, not loss.
    for table_name, targets in TARGETS.items():
        table = sa.table(table_name, *[sa.column(name) for name in targets])
        for name, (target_type, _) in targets.items():
            current_type = columns[table_name][name]["type"]
            if isinstance(target_type, sa.String) and (
                getattr(current_type, "length", None) is None
                or current_type.length > target_type.length
            ):
                length = sa.func.char_length if bind.dialect.name == "mysql" else sa.func.length
                longest = bind.scalar(sa.select(sa.func.max(length(table.c[name])))) or 0
                if longest > target_type.length:
                    raise RuntimeError(
                        f"Cannot narrow {table_name}.{name} to {target_type.length}: "
                        f"an existing value has {longest} characters. No alignment DDL was applied."
                    )

    events = sa.table("events", sa.column("enable_waitlist"), sa.column("waitlist"))
    for name, default in (("enable_waitlist", 1), ("waitlist", 0)):
        bind.execute(events.update().where(events.c[name].is_(None)).values({name: default}))

    for table_name, targets in TARGETS.items():
        with op.batch_alter_table(table_name) as batch:
            for name, (target_type, nullable) in targets.items():
                current = columns[table_name][name]
                options = {}
                if table_name == "events" and name in {"enable_waitlist", "waitlist"}:
                    options["server_default"] = sa.text("1" if name == "enable_waitlist" else "0")
                batch.alter_column(
                    name,
                    existing_type=current["type"],
                    existing_nullable=current["nullable"],
                    existing_server_default=current.get("default"),
                    type_=target_type,
                    nullable=nullable,
                    **options,
                )

    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("sponsor_tiers")}
    if "ix_sponsor_tiers_id" not in indexes:
        op.create_index("ix_sponsor_tiers_id", "sponsor_tiers", ["id"], unique=False)


def downgrade():
    raise RuntimeError(
        "Automatic downgrade would narrow expanded text and discard event times. "
        "Use a reviewed data migration or restore a backup instead."
    )
