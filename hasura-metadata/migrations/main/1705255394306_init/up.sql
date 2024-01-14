SET check_function_bodies = false;
CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$;
CREATE TABLE public.jobs_queue (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    worker_id uuid,
    status text DEFAULT 'new'::text,
    last_processed_at timestamp with time zone,
    payload jsonb,
    result jsonb,
    number_of_retries integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.jobs_queue IS 'Table containing jobs';
ALTER TABLE ONLY public.jobs_queue
    ADD CONSTRAINT jobs_queue_pkey PRIMARY KEY (id);

CREATE TRIGGER set_public_jobs_queue_updated_at BEFORE UPDATE ON public.jobs_queue FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_jobs_queue_updated_at ON public.jobs_queue IS 'trigger to set value of column "updated_at" to current timestamp on row update';
