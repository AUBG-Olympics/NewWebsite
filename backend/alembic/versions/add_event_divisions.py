"""Named event divisions with independent team rules and registration limits."""

from alembic import op
import sqlalchemy as sa

revision = "f9a2b3c4d5e6"
down_revision = "e8f1a2b3c4d5"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    events = sa.table("events", *[sa.column(name) for name in (
        "id", "separated_genders", "min_teammates", "max_teammates", "max_participants",
        "max_participants_male", "max_participants_female", "enable_waitlist", "waitlist_max_participants",
    )])
    submissions = sa.table("form_submissions", sa.column("event_id"), sa.column("gender"), sa.column("division_id"))
    event_rows = list(bind.execute(sa.select(events)).mappings())
    for event in event_rows:
        minimum, maximum = event["min_teammates"] or 0, event["max_teammates"] or 0
        if minimum < 0 or maximum < minimum:
            raise RuntimeError(f"Event {event['id']} has invalid teammate limits. Correct them before migrating divisions.")
        for field in ("max_participants", "max_participants_male", "max_participants_female", "waitlist_max_participants"):
            if event[field] is not None and event[field] < 0:
                raise RuntimeError(f"Event {event['id']} has a negative {field}. Correct it before migrating divisions.")

    op.add_column("events", sa.Column("uses_custom_divisions", sa.Boolean(), nullable=False, server_default=sa.text("0")))
    divisions = op.create_table(
        "event_divisions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("min_teammates", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("max_teammates", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("max_participants", sa.Integer(), nullable=True),
        sa.Column("waitlist_max_participants", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("legacy_gender", sa.String(31), nullable=True),
    )
    op.create_index("ix_event_divisions_event_id", "event_divisions", ["event_id"])
    op.add_column("form_submissions", sa.Column("division_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_form_submissions_division", "form_submissions", "event_divisions", ["division_id"], ["id"])
    op.create_index("ix_form_submissions_division_id", "form_submissions", ["division_id"])
    op.alter_column("form_submissions", "sport", existing_type=sa.String(63), type_=sa.String(255), existing_nullable=False)

    for event in event_rows:
        genders = [("Men", "male"), ("Women", "female")] if event["separated_genders"] else [("Open", None)]
        for order, (name, gender) in enumerate(genders):
            cap = event[f"max_participants_{gender}"] if gender else event["max_participants"]
            if cap is None:
                cap = event["max_participants"]
            result = bind.execute(divisions.insert().values(
                event_id=event["id"], name=name,
                min_teammates=event["min_teammates"] or 0, max_teammates=event["max_teammates"] or 0,
                max_participants=cap,
                waitlist_max_participants=(event["waitlist_max_participants"] or 0) if event["enable_waitlist"] else 0,
                sort_order=order, is_active=True, legacy_gender=gender,
            ))
            query = submissions.update().where(submissions.c.event_id == event["id"])
            if gender:
                aliases = ("male", "man") if gender == "male" else ("female", "woman")
                query = query.where(sa.func.lower(sa.func.trim(submissions.c.gender)).in_(aliases))
            bind.execute(query.values(division_id=result.inserted_primary_key[0]))
        # Preserve and account for historical submissions with missing/unknown
        # gender, rather than silently omitting them from counts and exports.
        remaining = sa.and_(submissions.c.event_id == event["id"], submissions.c.division_id.is_(None))
        if bind.scalar(sa.select(sa.func.count()).select_from(submissions).where(remaining)):
            result = bind.execute(divisions.insert().values(
                event_id=event["id"], name="Unspecified", min_teammates=event["min_teammates"] or 0,
                max_teammates=event["max_teammates"] or 0, max_participants=event["max_participants"],
                waitlist_max_participants=0, sort_order=2, is_active=True,
            ))
            bind.execute(submissions.update().where(remaining).values(division_id=result.inserted_primary_key[0]))


def downgrade():
    raise RuntimeError("Removing divisions would lose registration assignments. Use a reviewed data migration.")
