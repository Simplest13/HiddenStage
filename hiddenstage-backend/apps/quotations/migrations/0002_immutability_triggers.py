"""Database-level immutability for submitted quotation revisions.

The models already refuse these writes in Python. These triggers repeat the rule
inside PostgreSQL so a raw UPDATE, a `queryset.update()` or a future code path that
forgets the model guard still cannot alter quoted terms. Only lifecycle columns
(status, submitted_at, superseded_at, updated_at) may change after submission.

The item trigger deliberately tolerates an unresolvable parent (NULL status) so
that cascading deletes of a draft revision and its items cannot deadlock or fail.
"""

from django.db import migrations

CREATE_REVISION_GUARD = """
CREATE OR REPLACE FUNCTION hiddenstage_quotation_revision_immutable()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'DRAFT' THEN
            RAISE EXCEPTION 'submitted quotation revisions cannot be deleted (revision %)', OLD.id
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status <> 'DRAFT' THEN
        IF NEW.revision_number IS DISTINCT FROM OLD.revision_number
           OR NEW.quotation_id IS DISTINCT FROM OLD.quotation_id
           OR NEW.notes IS DISTINCT FROM OLD.notes
           OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
           OR NEW.total_paise IS DISTINCT FROM OLD.total_paise
           OR NEW.created_at IS DISTINCT FROM OLD.created_at
        THEN
            RAISE EXCEPTION 'submitted quotation revisions are immutable (revision %)', OLD.id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotations_revision_immutable ON quotations_quotationrevision;
CREATE TRIGGER quotations_revision_immutable
    BEFORE UPDATE OR DELETE ON quotations_quotationrevision
    FOR EACH ROW EXECUTE FUNCTION hiddenstage_quotation_revision_immutable();
"""

CREATE_ITEM_GUARD = """
CREATE OR REPLACE FUNCTION hiddenstage_quotation_item_draft_only()
RETURNS trigger AS $$
DECLARE
    parent_status text;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        SELECT status INTO parent_status
        FROM quotations_quotationrevision
        WHERE id = OLD.revision_id;
        IF parent_status IS NOT NULL AND parent_status <> 'DRAFT' THEN
            RAISE EXCEPTION 'items of a submitted quotation revision are immutable (item %)', OLD.id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT status INTO parent_status
        FROM quotations_quotationrevision
        WHERE id = NEW.revision_id;
        IF parent_status IS NOT NULL AND parent_status <> 'DRAFT' THEN
            RAISE EXCEPTION 'items cannot be added to a submitted quotation revision (item %)', NEW.id
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotations_item_draft_only ON quotations_quotationitem;
CREATE TRIGGER quotations_item_draft_only
    BEFORE INSERT OR UPDATE OR DELETE ON quotations_quotationitem
    FOR EACH ROW EXECUTE FUNCTION hiddenstage_quotation_item_draft_only();
"""

DROP_GUARDS = """
DROP TRIGGER IF EXISTS quotations_item_draft_only ON quotations_quotationitem;
DROP FUNCTION IF EXISTS hiddenstage_quotation_item_draft_only();
DROP TRIGGER IF EXISTS quotations_revision_immutable ON quotations_quotationrevision;
DROP FUNCTION IF EXISTS hiddenstage_quotation_revision_immutable();
"""


class Migration(migrations.Migration):
    dependencies = [("quotations", "0001_initial")]

    operations = [
        migrations.RunSQL(CREATE_REVISION_GUARD, DROP_GUARDS),
        migrations.RunSQL(CREATE_ITEM_GUARD, DROP_GUARDS),
    ]
