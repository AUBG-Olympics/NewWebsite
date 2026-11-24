import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from dotenv import load_dotenv

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Resolve .env relative to the backend, not the shell's working directory.
# An explicitly exported DATABASE_URL always wins.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# override the sqlalchemy.url from environment variable
database_url = os.getenv("DATABASE_URL")
if database_url:
    # ConfigParser treats percent signs as interpolation syntax, including in
    # URL-encoded passwords. Escape them only for the INI configuration layer.
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


import src.db.models
from src.db.database import Base

target_metadata = Base.metadata


def include_object(obj, name, type_, reflected, compare_to):
    # MySQL reflects the current database as schema=None, while the version
    # table is explicitly schema-qualified below. It is Alembic bookkeeping,
    # never an application table to remove during autogeneration.
    if type_ == "table" and reflected and name == "alembic_version":
        return False
    # The historical location column may still contain data. Autogeneration
    # must not propose deleting it as part of the division cleanup.
    return not (
        type_ == "column"
        and reflected
        and compare_to is None
        and obj.table.name == "events"
        and name == "location"
    )


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # For MySQL, Alembic/SQLAlchemy need an explicit schema when checking
        # for the alembic version table; otherwise MySQL's has_table() can
        # assert that schema is not None.
        db_schema = connection.engine.url.database

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            version_table_schema=db_schema,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
