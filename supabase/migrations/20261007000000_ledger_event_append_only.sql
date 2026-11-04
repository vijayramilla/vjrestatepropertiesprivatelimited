-- Status history is append-only; the service-role proxies are the only writers.
CREATE OR REPLACE FUNCTION public.ledger_record_compliance_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ledger_compliance_events
      (compliance_item_id, event_type, to_status, actor, details)
    VALUES (NEW.id, 'created', NEW.status, COALESCE(NEW.owner, ''), jsonb_build_object('evidence_status', NEW.evidence_status));
  ELSIF OLD.status IS DISTINCT FROM NEW.status OR OLD.evidence_status IS DISTINCT FROM NEW.evidence_status THEN
    INSERT INTO public.ledger_compliance_events
      (compliance_item_id, event_type, from_status, to_status, actor, details)
    VALUES (
      NEW.id,
      CASE WHEN OLD.evidence_status IS DISTINCT FROM NEW.evidence_status THEN 'evidence_changed' ELSE 'status_changed' END,
      OLD.status,
      NEW.status,
      COALESCE(NEW.owner, ''),
      jsonb_build_object('from_evidence_status', OLD.evidence_status, 'to_evidence_status', NEW.evidence_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ledger_compliance_event_after_write ON public.ledger_compliance_items;
CREATE TRIGGER ledger_compliance_event_after_write
AFTER INSERT OR UPDATE OF status, evidence_status ON public.ledger_compliance_items
FOR EACH ROW EXECUTE FUNCTION public.ledger_record_compliance_event();

REVOKE ALL ON FUNCTION public.ledger_record_compliance_event() FROM PUBLIC, anon, authenticated;
