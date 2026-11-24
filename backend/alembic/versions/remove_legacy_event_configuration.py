"""Remove fields superseded by named divisions after validating their backfill."""

from alembic import op
import sqlalchemy as sa

revision = "a0b3c4d5e6f7"
down_revision = "f9a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    missing_events = bind.scalar(sa.text(
        "SELECT COUNT(*) FROM events e WHERE NOT EXISTS "
        "(SELECT 1 FROM event_divisions d WHERE d.event_id=e.id AND d.is_active=1)"
    ))
    invalid_registrations = bind.scalar(sa.text(
        "SELECT COUNT(*) FROM form_submissions f LEFT JOIN event_divisions d ON d.id=f.division_id "
        "WHERE d.id IS NULL OR d.event_id<>f.event_id"
    ))
    if missing_events or invalid_registrations:
        raise RuntimeError(
            "Division backfill is incomplete. Assign every event and registration "
            "to its divisions before removing legacy configuration."
        )

    # Earlier revisions stay intact for fresh installs and older databases.
    # Their values have already been copied into event_divisions by the parent.
    columns = {column["name"] for column in sa.inspect(bind).get_columns("events")}
    for name in (
        "separated_genders", "max_teammates", "min_teammates", "max_participants",
        "max_participants_male", "max_participants_female", "enable_waitlist",
        "waitlist", "waitlist_max_participants", "uses_custom_divisions", "teammates",
    ):
        if name in columns:
            op.drop_column("events", name)
    op.drop_column("event_divisions", "legacy_gender")
    op.drop_column("form_submissions", "gender")
    op.alter_column("form_submissions", "division_id", existing_type=sa.Integer(), nullable=False)


def downgrade():
    raise RuntimeError("Global/gender configuration cannot represent arbitrary divisions. Restore a backup instead.")
