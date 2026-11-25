--
-- PostgreSQL database dump
--

\restrict sWlMntCjsAFgBtNd7MD09K9Cyl9j6EZ11e4iQ9fk2OW82fbKAFqJYiUOoQ586vf

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: hiddenstage_quotation_item_draft_only(); Type: FUNCTION; Schema: public; Owner: hiddenstage
--

CREATE FUNCTION public.hiddenstage_quotation_item_draft_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.hiddenstage_quotation_item_draft_only() OWNER TO hiddenstage;

--
-- Name: hiddenstage_quotation_revision_immutable(); Type: FUNCTION; Schema: public; Owner: hiddenstage
--

CREATE FUNCTION public.hiddenstage_quotation_revision_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.hiddenstage_quotation_revision_immutable() OWNER TO hiddenstage;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts_emailverificationtoken; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.accounts_emailverificationtoken (
    id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.accounts_emailverificationtoken OWNER TO hiddenstage;

--
-- Name: accounts_passwordresettoken; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.accounts_passwordresettoken (
    id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.accounts_passwordresettoken OWNER TO hiddenstage;

--
-- Name: accounts_user; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.accounts_user (
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    id uuid NOT NULL,
    email character varying(254) NOT NULL,
    full_name character varying(150) NOT NULL,
    phone character varying(20) NOT NULL,
    role character varying(20) NOT NULL,
    email_verified_at timestamp with time zone,
    terms_accepted_at timestamp with time zone,
    is_active boolean NOT NULL,
    is_staff boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL,
    CONSTRAINT user_role_valid CHECK (((role)::text = ANY ((ARRAY['CUSTOMER'::character varying, 'PROVIDER'::character varying])::text[])))
);


ALTER TABLE public.accounts_user OWNER TO hiddenstage;

--
-- Name: accounts_user_groups; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.accounts_user_groups (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    group_id integer NOT NULL
);


ALTER TABLE public.accounts_user_groups OWNER TO hiddenstage;

--
-- Name: accounts_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.accounts_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user_user_permissions; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.accounts_user_user_permissions (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.accounts_user_user_permissions OWNER TO hiddenstage;

--
-- Name: accounts_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.accounts_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


ALTER TABLE public.auth_group OWNER TO hiddenstage;

--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_group_permissions OWNER TO hiddenstage;

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


ALTER TABLE public.auth_permission OWNER TO hiddenstage;

--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: commitments_commitment; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.commitments_commitment (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    total_paise bigint NOT NULL,
    accepted_at timestamp with time zone NOT NULL,
    released_at timestamp with time zone,
    release_reason text NOT NULL,
    customer_id uuid NOT NULL,
    event_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    quotation_id uuid NOT NULL,
    released_by_id uuid,
    revision_id uuid NOT NULL,
    CONSTRAINT commitment_release_consistency CHECK (((((status)::text = 'ACTIVE'::text) AND (released_at IS NULL)) OR ((status)::text = 'RELEASED'::text))),
    CONSTRAINT commitment_status_valid CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'RELEASED'::character varying])::text[]))),
    CONSTRAINT commitment_total_non_negative CHECK ((total_paise >= 0))
);


ALTER TABLE public.commitments_commitment OWNER TO hiddenstage;

--
-- Name: commitments_commitmentaudit; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.commitments_commitmentaudit (
    id uuid NOT NULL,
    action character varying(20) NOT NULL,
    note text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    actor_id uuid,
    commitment_id uuid NOT NULL,
    CONSTRAINT commitment_audit_action_valid CHECK (((action)::text = ANY ((ARRAY['ACCEPTED'::character varying, 'RELEASED'::character varying])::text[])))
);


ALTER TABLE public.commitments_commitmentaudit OWNER TO hiddenstage;

--
-- Name: commitments_commitmentline; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.commitments_commitmentline (
    id uuid NOT NULL,
    package_key character varying(40) NOT NULL,
    title character varying(150) NOT NULL,
    amount_paise bigint NOT NULL,
    created_at timestamp with time zone NOT NULL,
    commitment_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    revision_item_id uuid NOT NULL,
    CONSTRAINT commitment_line_amount_non_negative CHECK ((amount_paise >= 0))
);


ALTER TABLE public.commitments_commitmentline OWNER TO hiddenstage;

--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id uuid NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


ALTER TABLE public.django_admin_log OWNER TO hiddenstage;

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


ALTER TABLE public.django_content_type OWNER TO hiddenstage;

--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


ALTER TABLE public.django_migrations OWNER TO hiddenstage;

--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: hiddenstage
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


ALTER TABLE public.django_session OWNER TO hiddenstage;

--
-- Name: events_event; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.events_event (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    name character varying(150) NOT NULL,
    event_type character varying(60) NOT NULL,
    description text NOT NULL,
    event_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    guest_count integer NOT NULL,
    pin_code character varying(6) NOT NULL,
    locality character varying(120) NOT NULL,
    city character varying(80) NOT NULL,
    state character varying(80) NOT NULL,
    venue_name character varying(200) NOT NULL,
    venue_address text NOT NULL,
    status character varying(20) NOT NULL,
    submitted_at timestamp with time zone,
    withdrawn_at timestamp with time zone,
    closed_at timestamp with time zone,
    customer_id uuid NOT NULL,
    CONSTRAINT event_end_after_start CHECK ((end_time > start_time)),
    CONSTRAINT event_guest_count_positive CHECK ((guest_count >= 1)),
    CONSTRAINT event_status_valid CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'WITHDRAWN'::character varying, 'CLOSED'::character varying])::text[]))),
    CONSTRAINT events_event_guest_count_check CHECK ((guest_count >= 0))
);


ALTER TABLE public.events_event OWNER TO hiddenstage;

--
-- Name: events_eventattachment; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.events_eventattachment (
    id uuid NOT NULL,
    file character varying(100) NOT NULL,
    original_name character varying(255) NOT NULL,
    content_type character varying(100) NOT NULL,
    size_bytes bigint NOT NULL,
    scan_status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    event_id uuid NOT NULL,
    uploaded_by_id uuid NOT NULL,
    CONSTRAINT attachment_scan_status_valid CHECK (((scan_status)::text = ANY ((ARRAY['PENDING'::character varying, 'CLEAN'::character varying, 'REJECTED'::character varying, 'SKIPPED'::character varying])::text[]))),
    CONSTRAINT attachment_size_positive CHECK ((size_bytes > 0))
);


ALTER TABLE public.events_eventattachment OWNER TO hiddenstage;

--
-- Name: events_servicerequirement; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.events_servicerequirement (
    id uuid NOT NULL,
    title character varying(150) NOT NULL,
    description text NOT NULL,
    budget_paise bigint,
    instructions text NOT NULL,
    status character varying(20) NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    category_id uuid NOT NULL,
    event_id uuid NOT NULL,
    CONSTRAINT events_servicerequirement_position_check CHECK (("position" >= 0)),
    CONSTRAINT requirement_budget_non_negative CHECK ((budget_paise >= 0)),
    CONSTRAINT requirement_status_valid CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'COMMITTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.events_servicerequirement OWNER TO hiddenstage;

--
-- Name: invitations_invitation; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.invitations_invitation (
    id uuid NOT NULL,
    message text NOT NULL,
    status character varying(20) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    created_by_id uuid NOT NULL,
    event_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    requirement_id uuid,
    CONSTRAINT invitation_status_valid CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'DECLINED'::character varying, 'WITHDRAWN'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.invitations_invitation OWNER TO hiddenstage;

--
-- Name: network_networkassociation; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.network_networkassociation (
    id uuid NOT NULL,
    status character varying(20) NOT NULL,
    associated_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    ended_reason text NOT NULL,
    ended_by_id uuid,
    manager_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    CONSTRAINT network_association_distinct_users CHECK ((NOT (manager_id = worker_id))),
    CONSTRAINT network_association_end_consistency CHECK ((((ended_at IS NULL) AND ((status)::text = 'ACTIVE'::text)) OR ((status)::text = 'ENDED'::text))),
    CONSTRAINT network_association_status_valid CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ENDED'::character varying])::text[])))
);


ALTER TABLE public.network_networkassociation OWNER TO hiddenstage;

--
-- Name: network_networkinvitation; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.network_networkinvitation (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    message text NOT NULL,
    status character varying(20) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    manager_id uuid NOT NULL,
    worker_id uuid NOT NULL,
    CONSTRAINT network_invitation_distinct_users CHECK ((NOT (manager_id = worker_id))),
    CONSTRAINT network_invitation_status_valid CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'DECLINED'::character varying, 'CANCELLED'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.network_networkinvitation OWNER TO hiddenstage;

--
-- Name: network_workerassignment; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.network_workerassignment (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    role character varying(120) NOT NULL,
    task_description text NOT NULL,
    instructions text NOT NULL,
    event_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    reporting_time time without time zone,
    location text NOT NULL,
    compensation_paise bigint,
    response_deadline timestamp with time zone,
    status character varying(20) NOT NULL,
    responded_at timestamp with time zone,
    accepted_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    response_note text NOT NULL,
    cancellation_reason text NOT NULL,
    completion_notes text NOT NULL,
    commitment_id uuid NOT NULL,
    manager_id uuid NOT NULL,
    replaces_id uuid,
    worker_id uuid NOT NULL,
    CONSTRAINT assignment_compensation_non_negative CHECK ((compensation_paise >= 0)),
    CONSTRAINT assignment_distinct_users CHECK ((NOT (manager_id = worker_id))),
    CONSTRAINT assignment_end_after_start CHECK ((end_time > start_time)),
    CONSTRAINT assignment_status_valid CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SENT'::character varying, 'ACCEPTED'::character varying, 'DECLINED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'REASSIGNED'::character varying])::text[])))
);


ALTER TABLE public.network_workerassignment OWNER TO hiddenstage;

--
-- Name: profiles_business; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.profiles_business (
    id uuid NOT NULL,
    name character varying(150) NOT NULL,
    description text NOT NULL,
    city character varying(80) NOT NULL,
    state character varying(80) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.profiles_business OWNER TO hiddenstage;

--
-- Name: profiles_businessrepresentative; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.profiles_businessrepresentative (
    id uuid NOT NULL,
    role character varying(20) NOT NULL,
    scopes jsonb NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT representative_role_valid CHECK (((role)::text = ANY ((ARRAY['PRIMARY'::character varying, 'ADDITIONAL'::character varying])::text[])))
);


ALTER TABLE public.profiles_businessrepresentative OWNER TO hiddenstage;

--
-- Name: profiles_customerprofile; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.profiles_customerprofile (
    id uuid NOT NULL,
    pin_code character varying(6) NOT NULL,
    locality character varying(120) NOT NULL,
    city character varying(80) NOT NULL,
    state character varying(80) NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.profiles_customerprofile OWNER TO hiddenstage;

--
-- Name: profiles_providercoverage; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.profiles_providercoverage (
    id uuid NOT NULL,
    pin_code character varying(6) NOT NULL,
    locality character varying(120) NOT NULL,
    city character varying(80) NOT NULL,
    state character varying(80) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    provider_id uuid NOT NULL
);


ALTER TABLE public.profiles_providercoverage OWNER TO hiddenstage;

--
-- Name: profiles_providerprofile; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.profiles_providerprofile (
    id uuid NOT NULL,
    display_name character varying(150) NOT NULL,
    description text NOT NULL,
    contact character varying(120) NOT NULL,
    verification_status character varying(20) NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    business_id uuid,
    user_id uuid NOT NULL,
    kind character varying(20) NOT NULL,
    CONSTRAINT provider_kind_valid CHECK (((kind)::text = ANY ((ARRAY['MANAGER'::character varying, 'WORKER'::character varying])::text[]))),
    CONSTRAINT provider_verification_status_valid CHECK (((verification_status)::text = ANY ((ARRAY['UNVERIFIED'::character varying, 'PENDING'::character varying, 'VERIFIED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE public.profiles_providerprofile OWNER TO hiddenstage;

--
-- Name: profiles_providerservice; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.profiles_providerservice (
    id uuid NOT NULL,
    title character varying(150) NOT NULL,
    description text NOT NULL,
    base_price_paise bigint,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    provider_id uuid NOT NULL,
    category_id uuid NOT NULL,
    CONSTRAINT provider_service_price_non_negative CHECK ((base_price_paise >= 0))
);


ALTER TABLE public.profiles_providerservice OWNER TO hiddenstage;

--
-- Name: profiles_servicecategory; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.profiles_servicecategory (
    id uuid NOT NULL,
    code character varying(60) NOT NULL,
    name character varying(80) NOT NULL,
    description text NOT NULL,
    sort_order integer NOT NULL,
    is_active boolean NOT NULL,
    CONSTRAINT profiles_servicecategory_sort_order_check CHECK ((sort_order >= 0))
);


ALTER TABLE public.profiles_servicecategory OWNER TO hiddenstage;

--
-- Name: quotations_quotation; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.quotations_quotation (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    event_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    current_revision_id uuid,
    CONSTRAINT quotation_status_valid CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'WITHDRAWN'::character varying])::text[])))
);


ALTER TABLE public.quotations_quotation OWNER TO hiddenstage;

--
-- Name: quotations_quotationitem; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.quotations_quotationitem (
    id uuid NOT NULL,
    kind character varying(10) NOT NULL,
    package_key character varying(40) NOT NULL,
    title character varying(150) NOT NULL,
    description text NOT NULL,
    amount_paise bigint NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    requirement_id uuid NOT NULL,
    revision_id uuid NOT NULL,
    CONSTRAINT quotation_item_amount_non_negative CHECK ((amount_paise >= 0)),
    CONSTRAINT quotation_item_kind_valid CHECK (((kind)::text = ANY ((ARRAY['LINE'::character varying, 'PACKAGE'::character varying])::text[]))),
    CONSTRAINT quotation_item_package_key_rules CHECK (((((kind)::text = 'LINE'::text) AND ((package_key)::text = ''::text)) OR (((kind)::text = 'PACKAGE'::text) AND (NOT ((package_key)::text = ''::text))))),
    CONSTRAINT quotations_quotationitem_position_check CHECK (("position" >= 0))
);


ALTER TABLE public.quotations_quotationitem OWNER TO hiddenstage;

--
-- Name: quotations_quotationrevision; Type: TABLE; Schema: public; Owner: hiddenstage
--

CREATE TABLE public.quotations_quotationrevision (
    id uuid NOT NULL,
    revision_number integer NOT NULL,
    status character varying(20) NOT NULL,
    notes text NOT NULL,
    valid_until date,
    total_paise bigint NOT NULL,
    submitted_at timestamp with time zone,
    superseded_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    quotation_id uuid NOT NULL,
    CONSTRAINT quotations_quotationrevision_revision_number_check CHECK ((revision_number >= 0)),
    CONSTRAINT revision_number_positive CHECK ((revision_number >= 1)),
    CONSTRAINT revision_status_valid CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'SUPERSEDED'::character varying, 'WITHDRAWN'::character varying, 'EXPIRED'::character varying])::text[]))),
    CONSTRAINT revision_total_non_negative CHECK ((total_paise >= 0))
);


ALTER TABLE public.quotations_quotationrevision OWNER TO hiddenstage;

--
-- Data for Name: accounts_emailverificationtoken; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.accounts_emailverificationtoken (id, token_hash, expires_at, used_at, created_at, user_id) FROM stdin;
\.


--
-- Data for Name: accounts_passwordresettoken; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.accounts_passwordresettoken (id, token_hash, expires_at, used_at, created_at, user_id) FROM stdin;
\.


--
-- Data for Name: accounts_user; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.accounts_user (password, last_login, is_superuser, id, email, full_name, phone, role, email_verified_at, terms_accepted_at, is_active, is_staff, date_joined) FROM stdin;
pbkdf2_sha256$1000000$HnSWZX9lEoOCiIbM4fTQ38$9aPXdyQH+R7vDOoKOGNvXxqc1mZjE1EPEbxzGk+dsgI=	2026-11-18 06:32:16.766503+00	f	89a47ee0-130c-4e13-a0a7-c554960b3ec9	heyshivamhru@gmail.com	shivam		CUSTOMER	\N	2026-11-17 15:21:18.76198+00	t	f	2026-11-17 15:21:18.762552+00
pbkdf2_sha256$1000000$525barou5yQEh317esDza4$SE1Yrrji56WuEHHHieS2ZduEfN1v0n2bnaZmNBKM0r4=	2026-11-18 07:36:49.857149+00	f	9b446538-2044-43a2-935e-c352f476f943	heyshivam@gmail.com	Shivamm	9426579019	PROVIDER	\N	2026-11-18 07:31:23.086956+00	t	f	2026-11-18 07:31:23.086956+00
\.


--
-- Data for Name: accounts_user_groups; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.accounts_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: accounts_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.accounts_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add content type	4	add_contenttype
14	Can change content type	4	change_contenttype
15	Can delete content type	4	delete_contenttype
16	Can view content type	4	view_contenttype
17	Can add session	5	add_session
18	Can change session	5	change_session
19	Can delete session	5	delete_session
20	Can view session	5	view_session
21	Can add user	6	add_user
22	Can change user	6	change_user
23	Can delete user	6	delete_user
24	Can view user	6	view_user
25	Can add email verification token	7	add_emailverificationtoken
26	Can change email verification token	7	change_emailverificationtoken
27	Can delete email verification token	7	delete_emailverificationtoken
28	Can view email verification token	7	view_emailverificationtoken
29	Can add password reset token	8	add_passwordresettoken
30	Can change password reset token	8	change_passwordresettoken
31	Can delete password reset token	8	delete_passwordresettoken
32	Can view password reset token	8	view_passwordresettoken
33	Can add business	9	add_business
34	Can change business	9	change_business
35	Can delete business	9	delete_business
36	Can view business	9	view_business
37	Can add service category	10	add_servicecategory
38	Can change service category	10	change_servicecategory
39	Can delete service category	10	delete_servicecategory
40	Can view service category	10	view_servicecategory
41	Can add customer profile	11	add_customerprofile
42	Can change customer profile	11	change_customerprofile
43	Can delete customer profile	11	delete_customerprofile
44	Can view customer profile	11	view_customerprofile
45	Can add provider profile	12	add_providerprofile
46	Can change provider profile	12	change_providerprofile
47	Can delete provider profile	12	delete_providerprofile
48	Can view provider profile	12	view_providerprofile
49	Can add provider coverage	13	add_providercoverage
50	Can change provider coverage	13	change_providercoverage
51	Can delete provider coverage	13	delete_providercoverage
52	Can view provider coverage	13	view_providercoverage
53	Can add provider service	14	add_providerservice
54	Can change provider service	14	change_providerservice
55	Can delete provider service	14	delete_providerservice
56	Can view provider service	14	view_providerservice
57	Can add business representative	15	add_businessrepresentative
58	Can change business representative	15	change_businessrepresentative
59	Can delete business representative	15	delete_businessrepresentative
60	Can view business representative	15	view_businessrepresentative
61	Can add event	16	add_event
62	Can change event	16	change_event
63	Can delete event	16	delete_event
64	Can view event	16	view_event
65	Can add event attachment	17	add_eventattachment
66	Can change event attachment	17	change_eventattachment
67	Can delete event attachment	17	delete_eventattachment
68	Can view event attachment	17	view_eventattachment
69	Can add service requirement	18	add_servicerequirement
70	Can change service requirement	18	change_servicerequirement
71	Can delete service requirement	18	delete_servicerequirement
72	Can view service requirement	18	view_servicerequirement
73	Can add invitation	19	add_invitation
74	Can change invitation	19	change_invitation
75	Can delete invitation	19	delete_invitation
76	Can view invitation	19	view_invitation
77	Can add quotation	20	add_quotation
78	Can change quotation	20	change_quotation
79	Can delete quotation	20	delete_quotation
80	Can view quotation	20	view_quotation
81	Can add quotation revision	21	add_quotationrevision
82	Can change quotation revision	21	change_quotationrevision
83	Can delete quotation revision	21	delete_quotationrevision
84	Can view quotation revision	21	view_quotationrevision
85	Can add quotation item	22	add_quotationitem
86	Can change quotation item	22	change_quotationitem
87	Can delete quotation item	22	delete_quotationitem
88	Can view quotation item	22	view_quotationitem
89	Can add commitment	23	add_commitment
90	Can change commitment	23	change_commitment
91	Can delete commitment	23	delete_commitment
92	Can view commitment	23	view_commitment
93	Can add commitment audit	24	add_commitmentaudit
94	Can change commitment audit	24	change_commitmentaudit
95	Can delete commitment audit	24	delete_commitmentaudit
96	Can view commitment audit	24	view_commitmentaudit
97	Can add commitment line	25	add_commitmentline
98	Can change commitment line	25	change_commitmentline
99	Can delete commitment line	25	delete_commitmentline
100	Can view commitment line	25	view_commitmentline
101	Can add network association	26	add_networkassociation
102	Can change network association	26	change_networkassociation
103	Can delete network association	26	delete_networkassociation
104	Can view network association	26	view_networkassociation
105	Can add network invitation	27	add_networkinvitation
106	Can change network invitation	27	change_networkinvitation
107	Can delete network invitation	27	delete_networkinvitation
108	Can view network invitation	27	view_networkinvitation
109	Can add worker assignment	28	add_workerassignment
110	Can change worker assignment	28	change_workerassignment
111	Can delete worker assignment	28	delete_workerassignment
112	Can view worker assignment	28	view_workerassignment
\.


--
-- Data for Name: commitments_commitment; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.commitments_commitment (id, created_at, updated_at, status, total_paise, accepted_at, released_at, release_reason, customer_id, event_id, provider_id, quotation_id, released_by_id, revision_id) FROM stdin;
\.


--
-- Data for Name: commitments_commitmentaudit; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.commitments_commitmentaudit (id, action, note, created_at, actor_id, commitment_id) FROM stdin;
\.


--
-- Data for Name: commitments_commitmentline; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.commitments_commitmentline (id, package_key, title, amount_paise, created_at, commitment_id, requirement_id, revision_item_id) FROM stdin;
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	contenttypes	contenttype
5	sessions	session
6	accounts	user
7	accounts	emailverificationtoken
8	accounts	passwordresettoken
9	profiles	business
10	profiles	servicecategory
11	profiles	customerprofile
12	profiles	providerprofile
13	profiles	providercoverage
14	profiles	providerservice
15	profiles	businessrepresentative
16	events	event
17	events	eventattachment
18	events	servicerequirement
19	invitations	invitation
20	quotations	quotation
21	quotations	quotationrevision
22	quotations	quotationitem
23	commitments	commitment
24	commitments	commitmentaudit
25	commitments	commitmentline
26	network	networkassociation
27	network	networkinvitation
28	network	workerassignment
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-11-17 15:05:42.872544+00
2	contenttypes	0002_remove_content_type_name	2026-11-17 15:05:42.914082+00
3	auth	0001_initial	2026-11-17 15:05:43.157429+00
4	auth	0002_alter_permission_name_max_length	2026-11-17 15:05:43.180602+00
5	auth	0003_alter_user_email_max_length	2026-11-17 15:05:43.196867+00
6	auth	0004_alter_user_username_opts	2026-11-17 15:05:43.218448+00
7	auth	0005_alter_user_last_login_null	2026-11-17 15:05:43.238576+00
8	auth	0006_require_contenttypes_0002	2026-11-17 15:05:43.251695+00
9	auth	0007_alter_validators_add_error_messages	2026-11-17 15:05:43.27711+00
10	auth	0008_alter_user_username_max_length	2026-11-17 15:05:43.302846+00
11	auth	0009_alter_user_last_name_max_length	2026-11-17 15:05:43.329432+00
12	auth	0010_alter_group_name_max_length	2026-11-17 15:05:43.37583+00
13	auth	0011_update_proxy_permissions	2026-11-17 15:05:43.403561+00
14	auth	0012_alter_user_first_name_max_length	2026-11-17 15:05:43.42274+00
15	accounts	0001_initial	2026-11-17 15:05:43.943158+00
16	admin	0001_initial	2026-11-17 15:05:44.054717+00
17	admin	0002_logentry_remove_auto_add	2026-11-17 15:05:44.080864+00
18	admin	0003_logentry_add_action_flag_choices	2026-11-17 15:05:44.106961+00
19	profiles	0001_initial	2026-11-17 15:05:45.147153+00
20	events	0001_initial	2026-11-17 15:05:45.830101+00
21	quotations	0001_initial	2026-11-17 15:05:46.564615+00
22	commitments	0001_initial	2026-11-17 15:05:47.666119+00
23	invitations	0001_initial	2026-11-17 15:05:47.978394+00
24	network	0001_initial	2026-11-17 15:05:48.610207+00
25	profiles	0002_seed_service_categories	2026-11-17 15:05:49.090179+00
26	profiles	0003_providerprofile_kind_and_more	2026-11-17 15:05:49.185344+00
27	quotations	0002_immutability_triggers	2026-11-17 15:05:49.246474+00
28	sessions	0001_initial	2026-11-17 15:05:49.312205+00
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
pdmx9kuuocd337cx0q1hehaf32rd79z2	.eJxVy0EOwiAQQNG7sJYGmAHBpYnnaIaBSRu1NqVdGe9umnSh25__3qqnbR36rdWlH4u6qJQRg4eonUHUCOR0Al81g3eC5yAJQZ1-WSa-12m3NM-tI-bXNq2tO3rrbk8aH9fj-qMDtWF3NmWbqJoslCs7i8yeYoUCXLNxSZKlSCSGMoqJIRpbJGApEGMxoj5f0Mw_MQ:1xTaDp:-xDk5QG9BXoKVPPwDOjsh8rRxch76OTb9Gs_NH376xg	2026-12-02 07:36:49.904341+00
\.


--
-- Data for Name: events_event; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.events_event (id, created_at, updated_at, name, event_type, description, event_date, start_time, end_time, guest_count, pin_code, locality, city, state, venue_name, venue_address, status, submitted_at, withdrawn_at, closed_at, customer_id) FROM stdin;
aa6d821e-b85b-4b17-8155-bc33b942e8d6	2026-11-17 15:29:11.1117+00	2026-11-17 15:44:04.834567+00	Ishikas engagement	Engagement		2027-02-14	10:57:00	14:57:00	50	560083	AMCEC	Bengaluru	Karnataka		AMC Engineering college	SUBMITTED	2026-11-17 15:44:04.834009+00	\N	\N	89a47ee0-130c-4e13-a0a7-c554960b3ec9
a0b56518-67bf-4963-a019-f2fd7360d9da	2026-11-18 07:26:52.876927+00	2026-11-18 07:26:52.876927+00	pari ka birthday party	Birthday		2027-02-18	00:43:00	02:45:00	50	395007	shivams house	Surat	Gujarat		E;208 Suman Dhara Magdalla police line surat Gujarat	DRAFT	\N	\N	\N	89a47ee0-130c-4e13-a0a7-c554960b3ec9
8c60a249-7d50-4e4b-b02e-421bcff5e8e3	2026-11-18 07:09:31.74815+00	2026-11-18 07:27:26.086907+00	hidden stage launch event	Corporate event		2026-12-22	11:30:00	13:24:00	50	560083	bengaluru urban	Bengaluru	Karnataka		Namane Appartment  69, oppt to PSBB School Sakalwara, Banerghatta Road, Bangalore 560083	SUBMITTED	2026-11-18 07:27:26.086907+00	\N	\N	89a47ee0-130c-4e13-a0a7-c554960b3ec9
\.


--
-- Data for Name: events_eventattachment; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.events_eventattachment (id, file, original_name, content_type, size_bytes, scan_status, created_at, event_id, uploaded_by_id) FROM stdin;
b6827757-5538-46e8-96a7-7508558a80e7	events/aa6d821e-b85b-4b17-8155-bc33b942e8d6/3e449744117a4b568aaef7503f9880c1.jpg	download.jpg	image/jpeg	196403	SKIPPED	2026-11-17 15:44:04.736832+00	aa6d821e-b85b-4b17-8155-bc33b942e8d6	89a47ee0-130c-4e13-a0a7-c554960b3ec9
2c4c6c7e-a009-49a8-9142-aa86d1841260	events/8c60a249-7d50-4e4b-b02e-421bcff5e8e3/c4915521d8124a35bcfc813b7237b132.jpg	IMG-20250902-WA0079.jpg	image/jpeg	140024	SKIPPED	2026-11-18 07:09:32.100015+00	8c60a249-7d50-4e4b-b02e-421bcff5e8e3	89a47ee0-130c-4e13-a0a7-c554960b3ec9
4a0fe9cd-cd70-4b05-a158-0de3c07454a8	events/8c60a249-7d50-4e4b-b02e-421bcff5e8e3/2e8e26987fa54988a509948e74337e0e.jpg	download.jpg	image/jpeg	196403	SKIPPED	2026-11-18 07:09:32.243277+00	8c60a249-7d50-4e4b-b02e-421bcff5e8e3	89a47ee0-130c-4e13-a0a7-c554960b3ec9
a3bfdfee-d927-4cc4-8084-c406ecf190fc	events/a0b56518-67bf-4963-a019-f2fd7360d9da/e46af3d8698746f598ea25ceff2c64c0.jpg	IMG-20250902-WA0077.jpg	image/jpeg	136269	SKIPPED	2026-11-18 07:26:53.176241+00	a0b56518-67bf-4963-a019-f2fd7360d9da	89a47ee0-130c-4e13-a0a7-c554960b3ec9
\.


--
-- Data for Name: events_servicerequirement; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.events_servicerequirement (id, title, description, budget_paise, instructions, status, "position", created_at, updated_at, category_id, event_id) FROM stdin;
d331dd43-1813-45ce-8fa5-bc960ef9adaf	Vegetarian dinner for 80	main course, biryani, rasgulla	100000000		OPEN	0	2026-11-17 15:44:04.532535+00	2026-11-17 15:44:04.532535+00	2df1429a-28a3-4803-a002-c9b41e7292c6	aa6d821e-b85b-4b17-8155-bc33b942e8d6
8d2a9073-cfb0-478f-99fd-ae605a903b9b	Decor for engagement		\N		OPEN	1	2026-11-17 15:44:04.545483+00	2026-11-17 15:44:04.545483+00	915f733d-611b-4aeb-bbcb-4dfe0161e1fd	aa6d821e-b85b-4b17-8155-bc33b942e8d6
57e3181e-9f8e-44c5-a1cd-f020c875e7b6	minimal		\N		OPEN	2	2026-11-17 15:44:04.548843+00	2026-11-17 15:44:04.548843+00	c72a0de0-f0e5-4409-8cd3-039e0adb2ef0	aa6d821e-b85b-4b17-8155-bc33b942e8d6
5b130592-85d2-421d-b86b-463a433a584c	vegetarian food - buffet	meghana's paneer biryani, anand sweets- rasgulla, ras malai, rabdi, jalebi, bihari junction - litti chokha,	20000000		OPEN	0	2026-11-18 07:09:31.796712+00	2026-11-18 07:09:31.796712+00	2df1429a-28a3-4803-a002-c9b41e7292c6	8c60a249-7d50-4e4b-b02e-421bcff5e8e3
c1b5235b-937b-4d61-a74d-63cf139b7f8c	dslr	3 photographers, reel creators and editors	2300000		OPEN	1	2026-11-18 07:09:31.806175+00	2026-11-18 07:09:31.806175+00	90ab8fc9-3c3f-4731-ad31-f05358c3290d	8c60a249-7d50-4e4b-b02e-421bcff5e8e3
be326f46-1616-4ab7-9d11-f3c6c3507124	host the launch event	a 5 star launch event	\N		OPEN	2	2026-11-18 07:09:31.809147+00	2026-11-18 07:09:31.809147+00	eaa251b0-6974-4ec4-a979-0cd7081067a8	8c60a249-7d50-4e4b-b02e-421bcff5e8e3
e530951f-dd91-45bc-a87f-aa9fc3dd765e	whysokai	need whysokai for the singer, only rap music, hustle mostly, best dj music of all the famous rap songs combined	3000000		OPEN	0	2026-11-18 07:26:52.919853+00	2026-11-18 07:26:52.919853+00	816928b9-a680-4230-a905-992fe9575efa	a0b56518-67bf-4963-a019-f2fd7360d9da
0e5612b8-9364-471e-9a3e-60065ff28645	rage room	a rage room decor of the party place	2000000		OPEN	1	2026-11-18 07:26:52.928628+00	2026-11-18 07:26:52.928628+00	c72a0de0-f0e5-4409-8cd3-039e0adb2ef0	a0b56518-67bf-4963-a019-f2fd7360d9da
b0c693cf-5249-478e-aa62-127f93f3f5c4	scary broken decor	the entire decor should be of broken pieces or glassses or furniture ready to be broken under the rage	3000000		OPEN	2	2026-11-18 07:26:52.932639+00	2026-11-18 07:26:52.932639+00	915f733d-611b-4aeb-bbcb-4dfe0161e1fd	a0b56518-67bf-4963-a019-f2fd7360d9da
\.


--
-- Data for Name: invitations_invitation; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.invitations_invitation (id, message, status, expires_at, responded_at, created_at, updated_at, created_by_id, event_id, provider_id, requirement_id) FROM stdin;
\.


--
-- Data for Name: network_networkassociation; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.network_networkassociation (id, status, associated_at, ended_at, ended_reason, ended_by_id, manager_id, worker_id) FROM stdin;
\.


--
-- Data for Name: network_networkinvitation; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.network_networkinvitation (id, created_at, updated_at, message, status, expires_at, responded_at, manager_id, worker_id) FROM stdin;
\.


--
-- Data for Name: network_workerassignment; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.network_workerassignment (id, created_at, updated_at, role, task_description, instructions, event_date, start_time, end_time, reporting_time, location, compensation_paise, response_deadline, status, responded_at, accepted_at, started_at, completed_at, cancelled_at, response_note, cancellation_reason, completion_notes, commitment_id, manager_id, replaces_id, worker_id) FROM stdin;
\.


--
-- Data for Name: profiles_business; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.profiles_business (id, name, description, city, state, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: profiles_businessrepresentative; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.profiles_businessrepresentative (id, role, scopes, is_active, created_at, business_id, user_id) FROM stdin;
\.


--
-- Data for Name: profiles_customerprofile; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.profiles_customerprofile (id, pin_code, locality, city, state, completed_at, created_at, updated_at, user_id) FROM stdin;
2a9e7eed-e468-47c6-aa65-1d35477f4670	560083	bengaluru urban	Bengaluru	Karnataka	2026-11-17 15:26:01.631385+00	2026-11-17 15:26:01.634396+00	2026-11-18 07:29:31.102581+00	89a47ee0-130c-4e13-a0a7-c554960b3ec9
\.


--
-- Data for Name: profiles_providercoverage; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.profiles_providercoverage (id, pin_code, locality, city, state, created_at, provider_id) FROM stdin;
354b324f-c06b-4ea6-8c18-bf17c86e28c5	560083	banglore urban	Bengaluru	Karnataka	2026-11-18 07:32:56.032367+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b
\.


--
-- Data for Name: profiles_providerprofile; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.profiles_providerprofile (id, display_name, description, contact, verification_status, completed_at, created_at, updated_at, business_id, user_id, kind) FROM stdin;
f2b73aec-2d34-4ba3-9d13-b383dcf9973b	ABC	KBGVFTGRVJHREGBTYYH5Y	ts5278914@gmail.com	UNVERIFIED	2026-11-18 07:32:56.059614+00	2026-11-18 07:32:55.931797+00	2026-11-18 07:32:55.931797+00	\N	9b446538-2044-43a2-935e-c352f476f943	MANAGER
\.


--
-- Data for Name: profiles_providerservice; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.profiles_providerservice (id, title, description, base_price_paise, is_active, created_at, updated_at, provider_id, category_id) FROM stdin;
b8b1d86c-3369-45e0-8a49-3bdda91d965b			\N	t	2026-11-18 07:32:55.987058+00	2026-11-18 07:32:55.987058+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b	c72a0de0-f0e5-4409-8cd3-039e0adb2ef0
8d396f17-7691-4e02-9529-553caa97c914			\N	t	2026-11-18 07:32:55.998535+00	2026-11-18 07:32:55.998535+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b	286db06a-d7bf-4604-9972-d90d9005354a
c51645aa-0a7e-40be-979e-63064b232817			\N	t	2026-11-18 07:32:56.002691+00	2026-11-18 07:32:56.002691+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b	816928b9-a680-4230-a905-992fe9575efa
4e737e43-a7c0-48d0-8a90-40dfd6124af5			\N	t	2026-11-18 07:34:31.276504+00	2026-11-18 07:34:31.276504+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b	2df1429a-28a3-4803-a002-c9b41e7292c6
8efc0f83-b7ab-48eb-9be1-fdb8491301cd			\N	t	2026-11-18 07:34:40.624119+00	2026-11-18 07:34:40.624119+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b	915f733d-611b-4aeb-bbcb-4dfe0161e1fd
8767b614-f0d1-4e64-a2e6-890d3f1198a5			\N	t	2026-11-18 07:34:47.754421+00	2026-11-18 07:34:47.754421+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b	90ab8fc9-3c3f-4731-ad31-f05358c3290d
476de0a7-73e5-483b-bdd5-99cd4575343b			\N	t	2026-11-18 07:34:54.960788+00	2026-11-18 07:34:54.960788+00	f2b73aec-2d34-4ba3-9d13-b383dcf9973b	1fb08d9a-55b5-4c84-a2ae-eb182cd1beb2
\.


--
-- Data for Name: profiles_servicecategory; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.profiles_servicecategory (id, code, name, description, sort_order, is_active) FROM stdin;
c72a0de0-f0e5-4409-8cd3-039e0adb2ef0	spaces	Spaces	Places with room for everyone and everything you have in mind.	0	t
2df1429a-28a3-4803-a002-c9b41e7292c6	food-and-drink	Food & drink	Thoughtful menus, drinks, and service for the table.	1	t
816928b9-a680-4230-a905-992fe9575efa	music-and-performance	Music & performance	A sound or performance that gives the day its rhythm.	2	t
90ab8fc9-3c3f-4731-ad31-f05358c3290d	photography	Photography	A considered eye for the moments you want to keep.	3	t
1fb08d9a-55b5-4c84-a2ae-eb182cd1beb2	videography	Videography	Moving images to help revisit the day.	4	t
915f733d-611b-4aeb-bbcb-4dfe0161e1fd	decor-and-styling	Decor & styling	A setting shaped around your occasion and point of view.	5	t
286db06a-d7bf-4604-9972-d90d9005354a	dj-and-sound	DJ & sound	Sound and music shaped around the gathering.	6	t
eaa251b0-6974-4ec4-a979-0cd7081067a8	event-hosting	Event hosting	A host to guide guests through the occasion.	7	t
a6fb0847-ace0-4f52-9ccc-586bf52f74dd	planning	Planning	A steady hand to bring the many details together.	8	t
\.


--
-- Data for Name: quotations_quotation; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.quotations_quotation (id, created_at, updated_at, status, event_id, provider_id, current_revision_id) FROM stdin;
29395c39-9dcb-42ba-9986-2f5afd1f50c4	2026-11-18 07:33:21.67721+00	2026-11-18 07:33:53.905642+00	OPEN	aa6d821e-b85b-4b17-8155-bc33b942e8d6	9b446538-2044-43a2-935e-c352f476f943	291b2684-8e05-4695-bfef-c35b6cc2e169
\.


--
-- Data for Name: quotations_quotationitem; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.quotations_quotationitem (id, kind, package_key, title, description, amount_paise, "position", created_at, requirement_id, revision_id) FROM stdin;
26b67d7a-db13-4ed1-a9f7-44f3a0679467	LINE		minimal	A to Z	1454200	0	2026-11-18 07:33:53.751634+00	57e3181e-9f8e-44c5-a1cd-f020c875e7b6	291b2684-8e05-4695-bfef-c35b6cc2e169
\.


--
-- Data for Name: quotations_quotationrevision; Type: TABLE DATA; Schema: public; Owner: hiddenstage
--

COPY public.quotations_quotationrevision (id, revision_number, status, notes, valid_until, total_paise, submitted_at, superseded_at, created_at, updated_at, quotation_id) FROM stdin;
291b2684-8e05-4695-bfef-c35b6cc2e169	1	SUBMITTED	sshhhhhhhhhh	2026-12-02	1454200	2026-11-18 07:33:53.889066+00	\N	2026-11-18 07:33:53.522961+00	2026-11-18 07:33:53.898565+00	29395c39-9dcb-42ba-9986-2f5afd1f50c4
\.


--
-- Name: accounts_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.accounts_user_groups_id_seq', 1, false);


--
-- Name: accounts_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.accounts_user_user_permissions_id_seq', 1, false);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 112, true);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 28, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hiddenstage
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 28, true);


--
-- Name: accounts_emailverificationtoken accounts_emailverificationtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_emailverificationtoken
    ADD CONSTRAINT accounts_emailverificationtoken_pkey PRIMARY KEY (id);


--
-- Name: accounts_emailverificationtoken accounts_emailverificationtoken_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_emailverificationtoken
    ADD CONSTRAINT accounts_emailverificationtoken_token_hash_key UNIQUE (token_hash);


--
-- Name: accounts_passwordresettoken accounts_passwordresettoken_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_passwordresettoken
    ADD CONSTRAINT accounts_passwordresettoken_pkey PRIMARY KEY (id);


--
-- Name: accounts_passwordresettoken accounts_passwordresettoken_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_passwordresettoken
    ADD CONSTRAINT accounts_passwordresettoken_token_hash_key UNIQUE (token_hash);


--
-- Name: accounts_user accounts_user_email_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_email_key UNIQUE (email);


--
-- Name: accounts_user_groups accounts_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_groups accounts_user_groups_user_id_group_id_59c0b32f_uniq; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_group_id_59c0b32f_uniq UNIQUE (user_id, group_id);


--
-- Name: accounts_user accounts_user_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq UNIQUE (user_id, permission_id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: commitments_commitment commitments_commitment_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitment_pkey PRIMARY KEY (id);


--
-- Name: commitments_commitment commitments_commitment_quotation_id_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitment_quotation_id_key UNIQUE (quotation_id);


--
-- Name: commitments_commitmentaudit commitments_commitmentaudit_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentaudit
    ADD CONSTRAINT commitments_commitmentaudit_pkey PRIMARY KEY (id);


--
-- Name: commitments_commitmentline commitments_commitmentline_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentline
    ADD CONSTRAINT commitments_commitmentline_pkey PRIMARY KEY (id);


--
-- Name: commitments_commitmentline commitments_commitmentline_revision_item_id_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentline
    ADD CONSTRAINT commitments_commitmentline_revision_item_id_key UNIQUE (revision_item_id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: events_event events_event_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_event
    ADD CONSTRAINT events_event_pkey PRIMARY KEY (id);


--
-- Name: events_eventattachment events_eventattachment_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_eventattachment
    ADD CONSTRAINT events_eventattachment_pkey PRIMARY KEY (id);


--
-- Name: events_servicerequirement events_servicerequirement_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_servicerequirement
    ADD CONSTRAINT events_servicerequirement_pkey PRIMARY KEY (id);


--
-- Name: invitations_invitation invitations_invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.invitations_invitation
    ADD CONSTRAINT invitations_invitation_pkey PRIMARY KEY (id);


--
-- Name: network_networkassociation network_networkassociation_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_networkassociation
    ADD CONSTRAINT network_networkassociation_pkey PRIMARY KEY (id);


--
-- Name: network_networkinvitation network_networkinvitation_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_networkinvitation
    ADD CONSTRAINT network_networkinvitation_pkey PRIMARY KEY (id);


--
-- Name: network_workerassignment network_workerassignment_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_workerassignment
    ADD CONSTRAINT network_workerassignment_pkey PRIMARY KEY (id);


--
-- Name: network_workerassignment network_workerassignment_replaces_id_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_workerassignment
    ADD CONSTRAINT network_workerassignment_replaces_id_key UNIQUE (replaces_id);


--
-- Name: profiles_business profiles_business_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_business
    ADD CONSTRAINT profiles_business_pkey PRIMARY KEY (id);


--
-- Name: profiles_businessrepresentative profiles_businessrepresentative_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_businessrepresentative
    ADD CONSTRAINT profiles_businessrepresentative_pkey PRIMARY KEY (id);


--
-- Name: profiles_customerprofile profiles_customerprofile_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_customerprofile
    ADD CONSTRAINT profiles_customerprofile_pkey PRIMARY KEY (id);


--
-- Name: profiles_customerprofile profiles_customerprofile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_customerprofile
    ADD CONSTRAINT profiles_customerprofile_user_id_key UNIQUE (user_id);


--
-- Name: profiles_providercoverage profiles_providercoverage_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providercoverage
    ADD CONSTRAINT profiles_providercoverage_pkey PRIMARY KEY (id);


--
-- Name: profiles_providerprofile profiles_providerprofile_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerprofile
    ADD CONSTRAINT profiles_providerprofile_pkey PRIMARY KEY (id);


--
-- Name: profiles_providerprofile profiles_providerprofile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerprofile
    ADD CONSTRAINT profiles_providerprofile_user_id_key UNIQUE (user_id);


--
-- Name: profiles_providerservice profiles_providerservice_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerservice
    ADD CONSTRAINT profiles_providerservice_pkey PRIMARY KEY (id);


--
-- Name: profiles_servicecategory profiles_servicecategory_code_key; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_servicecategory
    ADD CONSTRAINT profiles_servicecategory_code_key UNIQUE (code);


--
-- Name: profiles_servicecategory profiles_servicecategory_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_servicecategory
    ADD CONSTRAINT profiles_servicecategory_pkey PRIMARY KEY (id);


--
-- Name: quotations_quotation quotations_quotation_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotation
    ADD CONSTRAINT quotations_quotation_pkey PRIMARY KEY (id);


--
-- Name: quotations_quotationitem quotations_quotationitem_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotationitem
    ADD CONSTRAINT quotations_quotationitem_pkey PRIMARY KEY (id);


--
-- Name: quotations_quotationrevision quotations_quotationrevision_pkey; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotationrevision
    ADD CONSTRAINT quotations_quotationrevision_pkey PRIMARY KEY (id);


--
-- Name: profiles_businessrepresentative uniq_business_representative; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_businessrepresentative
    ADD CONSTRAINT uniq_business_representative UNIQUE (business_id, user_id);


--
-- Name: profiles_providercoverage uniq_provider_coverage_location; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providercoverage
    ADD CONSTRAINT uniq_provider_coverage_location UNIQUE (provider_id, pin_code, locality, city, state);


--
-- Name: profiles_providerservice uniq_provider_service_category; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerservice
    ADD CONSTRAINT uniq_provider_service_category UNIQUE (provider_id, category_id);


--
-- Name: quotations_quotation uniq_quotation_per_event_provider; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotation
    ADD CONSTRAINT uniq_quotation_per_event_provider UNIQUE (event_id, provider_id);


--
-- Name: quotations_quotationrevision uniq_revision_number; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotationrevision
    ADD CONSTRAINT uniq_revision_number UNIQUE (quotation_id, revision_number);


--
-- Name: quotations_quotationitem uniq_revision_requirement_item; Type: CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotationitem
    ADD CONSTRAINT uniq_revision_requirement_item UNIQUE (revision_id, requirement_id);


--
-- Name: accounts_em_user_id_b5ffac_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_em_user_id_b5ffac_idx ON public.accounts_emailverificationtoken USING btree (user_id, expires_at);


--
-- Name: accounts_emailverificationtoken_token_hash_c34c21f7_like; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_emailverificationtoken_token_hash_c34c21f7_like ON public.accounts_emailverificationtoken USING btree (token_hash varchar_pattern_ops);


--
-- Name: accounts_emailverificationtoken_user_id_4ff4e6c5; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_emailverificationtoken_user_id_4ff4e6c5 ON public.accounts_emailverificationtoken USING btree (user_id);


--
-- Name: accounts_pa_user_id_e5b29b_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_pa_user_id_e5b29b_idx ON public.accounts_passwordresettoken USING btree (user_id, expires_at);


--
-- Name: accounts_passwordresettoken_token_hash_7479d5dc_like; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_passwordresettoken_token_hash_7479d5dc_like ON public.accounts_passwordresettoken USING btree (token_hash varchar_pattern_ops);


--
-- Name: accounts_passwordresettoken_user_id_2789bc5c; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_passwordresettoken_user_id_2789bc5c ON public.accounts_passwordresettoken USING btree (user_id);


--
-- Name: accounts_user_email_b2644a56_like; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_user_email_b2644a56_like ON public.accounts_user USING btree (email varchar_pattern_ops);


--
-- Name: accounts_user_groups_group_id_bd11a704; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_user_groups_group_id_bd11a704 ON public.accounts_user_groups USING btree (group_id);


--
-- Name: accounts_user_groups_user_id_52b62117; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_user_groups_user_id_52b62117 ON public.accounts_user_groups USING btree (user_id);


--
-- Name: accounts_user_user_permissions_permission_id_113bb443; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_user_user_permissions_permission_id_113bb443 ON public.accounts_user_user_permissions USING btree (permission_id);


--
-- Name: accounts_user_user_permissions_user_id_e4f0a161; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX accounts_user_user_permissions_user_id_e4f0a161 ON public.accounts_user_user_permissions USING btree (user_id);


--
-- Name: assign_commitment_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX assign_commitment_status_idx ON public.network_workerassignment USING btree (commitment_id, status);


--
-- Name: assign_manager_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX assign_manager_status_idx ON public.network_workerassignment USING btree (manager_id, status);


--
-- Name: assign_worker_date_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX assign_worker_date_status_idx ON public.network_workerassignment USING btree (worker_id, event_date, status);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: commit_customer_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commit_customer_status_idx ON public.commitments_commitment USING btree (customer_id, status);


--
-- Name: commit_provider_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commit_provider_status_idx ON public.commitments_commitment USING btree (provider_id, status);


--
-- Name: commitments_commitment_customer_id_36b99df5; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitment_customer_id_36b99df5 ON public.commitments_commitment USING btree (customer_id);


--
-- Name: commitments_commitment_event_id_a5e6e44e; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitment_event_id_a5e6e44e ON public.commitments_commitment USING btree (event_id);


--
-- Name: commitments_commitment_provider_id_6f57a475; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitment_provider_id_6f57a475 ON public.commitments_commitment USING btree (provider_id);


--
-- Name: commitments_commitment_released_by_id_f282692f; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitment_released_by_id_f282692f ON public.commitments_commitment USING btree (released_by_id);


--
-- Name: commitments_commitment_revision_id_a5ba1378; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitment_revision_id_a5ba1378 ON public.commitments_commitment USING btree (revision_id);


--
-- Name: commitments_commitmentaudit_actor_id_db488d06; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitmentaudit_actor_id_db488d06 ON public.commitments_commitmentaudit USING btree (actor_id);


--
-- Name: commitments_commitmentaudit_commitment_id_9df5c22b; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitmentaudit_commitment_id_9df5c22b ON public.commitments_commitmentaudit USING btree (commitment_id);


--
-- Name: commitments_commitmentline_commitment_id_47495542; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitmentline_commitment_id_47495542 ON public.commitments_commitmentline USING btree (commitment_id);


--
-- Name: commitments_commitmentline_requirement_id_fe1ae7b8; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX commitments_commitmentline_requirement_id_fe1ae7b8 ON public.commitments_commitmentline USING btree (requirement_id);


--
-- Name: coverage_city_state_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX coverage_city_state_idx ON public.profiles_providercoverage USING btree (city, state);


--
-- Name: coverage_pin_city_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX coverage_pin_city_idx ON public.profiles_providercoverage USING btree (pin_code, city);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: event_customer_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX event_customer_status_idx ON public.events_event USING btree (customer_id, status);


--
-- Name: event_pin_city_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX event_pin_city_idx ON public.events_event USING btree (pin_code, city);


--
-- Name: event_status_date_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX event_status_date_idx ON public.events_event USING btree (status, event_date);


--
-- Name: events_event_customer_id_d5d99f9f; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX events_event_customer_id_d5d99f9f ON public.events_event USING btree (customer_id);


--
-- Name: events_eventattachment_event_id_366a38c2; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX events_eventattachment_event_id_366a38c2 ON public.events_eventattachment USING btree (event_id);


--
-- Name: events_eventattachment_uploaded_by_id_decce5c8; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX events_eventattachment_uploaded_by_id_decce5c8 ON public.events_eventattachment USING btree (uploaded_by_id);


--
-- Name: events_servicerequirement_category_id_3dc34ae2; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX events_servicerequirement_category_id_3dc34ae2 ON public.events_servicerequirement USING btree (category_id);


--
-- Name: events_servicerequirement_event_id_d82f8f40; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX events_servicerequirement_event_id_d82f8f40 ON public.events_servicerequirement USING btree (event_id);


--
-- Name: invitation_event_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX invitation_event_status_idx ON public.invitations_invitation USING btree (event_id, status);


--
-- Name: invitation_provider_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX invitation_provider_status_idx ON public.invitations_invitation USING btree (provider_id, status);


--
-- Name: invitations_invitation_created_by_id_c289ec39; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX invitations_invitation_created_by_id_c289ec39 ON public.invitations_invitation USING btree (created_by_id);


--
-- Name: invitations_invitation_event_id_fbf96a24; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX invitations_invitation_event_id_fbf96a24 ON public.invitations_invitation USING btree (event_id);


--
-- Name: invitations_invitation_provider_id_44f2f7cf; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX invitations_invitation_provider_id_44f2f7cf ON public.invitations_invitation USING btree (provider_id);


--
-- Name: invitations_invitation_requirement_id_fd476629; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX invitations_invitation_requirement_id_fd476629 ON public.invitations_invitation USING btree (requirement_id);


--
-- Name: netassoc_manager_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX netassoc_manager_status_idx ON public.network_networkassociation USING btree (manager_id, status);


--
-- Name: netassoc_worker_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX netassoc_worker_status_idx ON public.network_networkassociation USING btree (worker_id, status);


--
-- Name: netinv_manager_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX netinv_manager_status_idx ON public.network_networkinvitation USING btree (manager_id, status);


--
-- Name: netinv_worker_status_idx; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX netinv_worker_status_idx ON public.network_networkinvitation USING btree (worker_id, status);


--
-- Name: network_networkassociation_ended_by_id_32ce6781; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_networkassociation_ended_by_id_32ce6781 ON public.network_networkassociation USING btree (ended_by_id);


--
-- Name: network_networkassociation_manager_id_2f0da643; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_networkassociation_manager_id_2f0da643 ON public.network_networkassociation USING btree (manager_id);


--
-- Name: network_networkassociation_worker_id_ed3ba545; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_networkassociation_worker_id_ed3ba545 ON public.network_networkassociation USING btree (worker_id);


--
-- Name: network_networkinvitation_manager_id_bbd17aae; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_networkinvitation_manager_id_bbd17aae ON public.network_networkinvitation USING btree (manager_id);


--
-- Name: network_networkinvitation_worker_id_111c83e1; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_networkinvitation_worker_id_111c83e1 ON public.network_networkinvitation USING btree (worker_id);


--
-- Name: network_workerassignment_commitment_id_a50e987f; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_workerassignment_commitment_id_a50e987f ON public.network_workerassignment USING btree (commitment_id);


--
-- Name: network_workerassignment_manager_id_d867a227; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_workerassignment_manager_id_d867a227 ON public.network_workerassignment USING btree (manager_id);


--
-- Name: network_workerassignment_worker_id_e0e7492d; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX network_workerassignment_worker_id_e0e7492d ON public.network_workerassignment USING btree (worker_id);


--
-- Name: profiles_businessrepresentative_business_id_22949c51; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX profiles_businessrepresentative_business_id_22949c51 ON public.profiles_businessrepresentative USING btree (business_id);


--
-- Name: profiles_businessrepresentative_user_id_acfd556d; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX profiles_businessrepresentative_user_id_acfd556d ON public.profiles_businessrepresentative USING btree (user_id);


--
-- Name: profiles_providercoverage_provider_id_0a15d631; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX profiles_providercoverage_provider_id_0a15d631 ON public.profiles_providercoverage USING btree (provider_id);


--
-- Name: profiles_providerprofile_business_id_4335212e; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX profiles_providerprofile_business_id_4335212e ON public.profiles_providerprofile USING btree (business_id);


--
-- Name: profiles_providerservice_category_id_56639071; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX profiles_providerservice_category_id_56639071 ON public.profiles_providerservice USING btree (category_id);


--
-- Name: profiles_providerservice_provider_id_934ef4e6; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX profiles_providerservice_provider_id_934ef4e6 ON public.profiles_providerservice USING btree (provider_id);


--
-- Name: profiles_servicecategory_code_324bec4f_like; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX profiles_servicecategory_code_324bec4f_like ON public.profiles_servicecategory USING btree (code varchar_pattern_ops);


--
-- Name: quotations_quotation_current_revision_id_c09cc836; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX quotations_quotation_current_revision_id_c09cc836 ON public.quotations_quotation USING btree (current_revision_id);


--
-- Name: quotations_quotation_event_id_66dc6049; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX quotations_quotation_event_id_66dc6049 ON public.quotations_quotation USING btree (event_id);


--
-- Name: quotations_quotation_provider_id_c97982b3; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX quotations_quotation_provider_id_c97982b3 ON public.quotations_quotation USING btree (provider_id);


--
-- Name: quotations_quotationitem_requirement_id_fcbdda32; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX quotations_quotationitem_requirement_id_fcbdda32 ON public.quotations_quotationitem USING btree (requirement_id);


--
-- Name: quotations_quotationitem_revision_id_8b23498f; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX quotations_quotationitem_revision_id_8b23498f ON public.quotations_quotationitem USING btree (revision_id);


--
-- Name: quotations_quotationrevision_quotation_id_5da6fa52; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE INDEX quotations_quotationrevision_quotation_id_5da6fa52 ON public.quotations_quotationrevision USING btree (quotation_id);


--
-- Name: uniq_active_network_association; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE UNIQUE INDEX uniq_active_network_association ON public.network_networkassociation USING btree (manager_id, worker_id) WHERE ((status)::text = 'ACTIVE'::text);


--
-- Name: uniq_active_primary_representative; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE UNIQUE INDEX uniq_active_primary_representative ON public.profiles_businessrepresentative USING btree (business_id) WHERE (is_active AND ((role)::text = 'PRIMARY'::text));


--
-- Name: uniq_pending_event_invitation; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE UNIQUE INDEX uniq_pending_event_invitation ON public.invitations_invitation USING btree (event_id, provider_id) WHERE ((requirement_id IS NULL) AND ((status)::text = 'PENDING'::text));


--
-- Name: uniq_pending_network_invitation; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE UNIQUE INDEX uniq_pending_network_invitation ON public.network_networkinvitation USING btree (manager_id, worker_id) WHERE ((status)::text = 'PENDING'::text);


--
-- Name: uniq_pending_requirement_invitation; Type: INDEX; Schema: public; Owner: hiddenstage
--

CREATE UNIQUE INDEX uniq_pending_requirement_invitation ON public.invitations_invitation USING btree (event_id, provider_id, requirement_id) WHERE ((requirement_id IS NOT NULL) AND ((status)::text = 'PENDING'::text));


--
-- Name: quotations_quotationitem quotations_item_draft_only; Type: TRIGGER; Schema: public; Owner: hiddenstage
--

CREATE TRIGGER quotations_item_draft_only BEFORE INSERT OR DELETE OR UPDATE ON public.quotations_quotationitem FOR EACH ROW EXECUTE FUNCTION public.hiddenstage_quotation_item_draft_only();


--
-- Name: quotations_quotationrevision quotations_revision_immutable; Type: TRIGGER; Schema: public; Owner: hiddenstage
--

CREATE TRIGGER quotations_revision_immutable BEFORE DELETE OR UPDATE ON public.quotations_quotationrevision FOR EACH ROW EXECUTE FUNCTION public.hiddenstage_quotation_revision_immutable();


--
-- Name: accounts_emailverificationtoken accounts_emailverifi_user_id_4ff4e6c5_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_emailverificationtoken
    ADD CONSTRAINT accounts_emailverifi_user_id_4ff4e6c5_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_passwordresettoken accounts_passwordres_user_id_2789bc5c_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_passwordresettoken
    ADD CONSTRAINT accounts_passwordres_user_id_2789bc5c_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_groups accounts_user_groups_group_id_bd11a704_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_group_id_bd11a704_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_groups accounts_user_groups_user_id_52b62117_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_52b62117_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_permission_id_113bb443_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_permission_id_113bb443_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_user_id_e4f0a161_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_user_id_e4f0a161_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitmentaudit commitments_commitme_actor_id_db488d06_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentaudit
    ADD CONSTRAINT commitments_commitme_actor_id_db488d06_fk_accounts_ FOREIGN KEY (actor_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitmentline commitments_commitme_commitment_id_47495542_fk_commitmen; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentline
    ADD CONSTRAINT commitments_commitme_commitment_id_47495542_fk_commitmen FOREIGN KEY (commitment_id) REFERENCES public.commitments_commitment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitmentaudit commitments_commitme_commitment_id_9df5c22b_fk_commitmen; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentaudit
    ADD CONSTRAINT commitments_commitme_commitment_id_9df5c22b_fk_commitmen FOREIGN KEY (commitment_id) REFERENCES public.commitments_commitment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitment commitments_commitme_quotation_id_5ea9d5e7_fk_quotation; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitme_quotation_id_5ea9d5e7_fk_quotation FOREIGN KEY (quotation_id) REFERENCES public.quotations_quotation(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitment commitments_commitme_released_by_id_f282692f_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitme_released_by_id_f282692f_fk_accounts_ FOREIGN KEY (released_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitmentline commitments_commitme_requirement_id_fe1ae7b8_fk_events_se; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentline
    ADD CONSTRAINT commitments_commitme_requirement_id_fe1ae7b8_fk_events_se FOREIGN KEY (requirement_id) REFERENCES public.events_servicerequirement(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitment commitments_commitme_revision_id_a5ba1378_fk_quotation; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitme_revision_id_a5ba1378_fk_quotation FOREIGN KEY (revision_id) REFERENCES public.quotations_quotationrevision(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitmentline commitments_commitme_revision_item_id_9b25defa_fk_quotation; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitmentline
    ADD CONSTRAINT commitments_commitme_revision_item_id_9b25defa_fk_quotation FOREIGN KEY (revision_item_id) REFERENCES public.quotations_quotationitem(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitment commitments_commitment_customer_id_36b99df5_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitment_customer_id_36b99df5_fk_accounts_user_id FOREIGN KEY (customer_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitment commitments_commitment_event_id_a5e6e44e_fk_events_event_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitment_event_id_a5e6e44e_fk_events_event_id FOREIGN KEY (event_id) REFERENCES public.events_event(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: commitments_commitment commitments_commitment_provider_id_6f57a475_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.commitments_commitment
    ADD CONSTRAINT commitments_commitment_provider_id_6f57a475_fk_accounts_user_id FOREIGN KEY (provider_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: events_event events_event_customer_id_d5d99f9f_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_event
    ADD CONSTRAINT events_event_customer_id_d5d99f9f_fk_accounts_user_id FOREIGN KEY (customer_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: events_eventattachment events_eventattachme_uploaded_by_id_decce5c8_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_eventattachment
    ADD CONSTRAINT events_eventattachme_uploaded_by_id_decce5c8_fk_accounts_ FOREIGN KEY (uploaded_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: events_eventattachment events_eventattachment_event_id_366a38c2_fk_events_event_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_eventattachment
    ADD CONSTRAINT events_eventattachment_event_id_366a38c2_fk_events_event_id FOREIGN KEY (event_id) REFERENCES public.events_event(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: events_servicerequirement events_servicerequir_category_id_3dc34ae2_fk_profiles_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_servicerequirement
    ADD CONSTRAINT events_servicerequir_category_id_3dc34ae2_fk_profiles_ FOREIGN KEY (category_id) REFERENCES public.profiles_servicecategory(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: events_servicerequirement events_servicerequirement_event_id_d82f8f40_fk_events_event_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.events_servicerequirement
    ADD CONSTRAINT events_servicerequirement_event_id_d82f8f40_fk_events_event_id FOREIGN KEY (event_id) REFERENCES public.events_event(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: invitations_invitation invitations_invitati_created_by_id_c289ec39_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.invitations_invitation
    ADD CONSTRAINT invitations_invitati_created_by_id_c289ec39_fk_accounts_ FOREIGN KEY (created_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: invitations_invitation invitations_invitati_requirement_id_fd476629_fk_events_se; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.invitations_invitation
    ADD CONSTRAINT invitations_invitati_requirement_id_fd476629_fk_events_se FOREIGN KEY (requirement_id) REFERENCES public.events_servicerequirement(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: invitations_invitation invitations_invitation_event_id_fbf96a24_fk_events_event_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.invitations_invitation
    ADD CONSTRAINT invitations_invitation_event_id_fbf96a24_fk_events_event_id FOREIGN KEY (event_id) REFERENCES public.events_event(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: invitations_invitation invitations_invitation_provider_id_44f2f7cf_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.invitations_invitation
    ADD CONSTRAINT invitations_invitation_provider_id_44f2f7cf_fk_accounts_user_id FOREIGN KEY (provider_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_networkassociation network_networkassoc_ended_by_id_32ce6781_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_networkassociation
    ADD CONSTRAINT network_networkassoc_ended_by_id_32ce6781_fk_accounts_ FOREIGN KEY (ended_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_networkassociation network_networkassoc_manager_id_2f0da643_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_networkassociation
    ADD CONSTRAINT network_networkassoc_manager_id_2f0da643_fk_accounts_ FOREIGN KEY (manager_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_networkassociation network_networkassoc_worker_id_ed3ba545_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_networkassociation
    ADD CONSTRAINT network_networkassoc_worker_id_ed3ba545_fk_accounts_ FOREIGN KEY (worker_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_networkinvitation network_networkinvit_manager_id_bbd17aae_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_networkinvitation
    ADD CONSTRAINT network_networkinvit_manager_id_bbd17aae_fk_accounts_ FOREIGN KEY (manager_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_networkinvitation network_networkinvit_worker_id_111c83e1_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_networkinvitation
    ADD CONSTRAINT network_networkinvit_worker_id_111c83e1_fk_accounts_ FOREIGN KEY (worker_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_workerassignment network_workerassign_commitment_id_a50e987f_fk_commitmen; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_workerassignment
    ADD CONSTRAINT network_workerassign_commitment_id_a50e987f_fk_commitmen FOREIGN KEY (commitment_id) REFERENCES public.commitments_commitment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_workerassignment network_workerassign_manager_id_d867a227_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_workerassignment
    ADD CONSTRAINT network_workerassign_manager_id_d867a227_fk_accounts_ FOREIGN KEY (manager_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_workerassignment network_workerassign_replaces_id_c873ab81_fk_network_w; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_workerassignment
    ADD CONSTRAINT network_workerassign_replaces_id_c873ab81_fk_network_w FOREIGN KEY (replaces_id) REFERENCES public.network_workerassignment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: network_workerassignment network_workerassignment_worker_id_e0e7492d_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.network_workerassignment
    ADD CONSTRAINT network_workerassignment_worker_id_e0e7492d_fk_accounts_user_id FOREIGN KEY (worker_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_businessrepresentative profiles_businessrep_business_id_22949c51_fk_profiles_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_businessrepresentative
    ADD CONSTRAINT profiles_businessrep_business_id_22949c51_fk_profiles_ FOREIGN KEY (business_id) REFERENCES public.profiles_business(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_businessrepresentative profiles_businessrep_user_id_acfd556d_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_businessrepresentative
    ADD CONSTRAINT profiles_businessrep_user_id_acfd556d_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_customerprofile profiles_customerprofile_user_id_4ff0e375_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_customerprofile
    ADD CONSTRAINT profiles_customerprofile_user_id_4ff0e375_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_providercoverage profiles_providercov_provider_id_0a15d631_fk_profiles_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providercoverage
    ADD CONSTRAINT profiles_providercov_provider_id_0a15d631_fk_profiles_ FOREIGN KEY (provider_id) REFERENCES public.profiles_providerprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_providerprofile profiles_providerpro_business_id_4335212e_fk_profiles_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerprofile
    ADD CONSTRAINT profiles_providerpro_business_id_4335212e_fk_profiles_ FOREIGN KEY (business_id) REFERENCES public.profiles_business(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_providerprofile profiles_providerprofile_user_id_76609763_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerprofile
    ADD CONSTRAINT profiles_providerprofile_user_id_76609763_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_providerservice profiles_providerser_category_id_56639071_fk_profiles_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerservice
    ADD CONSTRAINT profiles_providerser_category_id_56639071_fk_profiles_ FOREIGN KEY (category_id) REFERENCES public.profiles_servicecategory(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: profiles_providerservice profiles_providerser_provider_id_934ef4e6_fk_profiles_; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.profiles_providerservice
    ADD CONSTRAINT profiles_providerser_provider_id_934ef4e6_fk_profiles_ FOREIGN KEY (provider_id) REFERENCES public.profiles_providerprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: quotations_quotation quotations_quotation_current_revision_id_c09cc836_fk_quotation; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotation
    ADD CONSTRAINT quotations_quotation_current_revision_id_c09cc836_fk_quotation FOREIGN KEY (current_revision_id) REFERENCES public.quotations_quotationrevision(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: quotations_quotation quotations_quotation_event_id_66dc6049_fk_events_event_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotation
    ADD CONSTRAINT quotations_quotation_event_id_66dc6049_fk_events_event_id FOREIGN KEY (event_id) REFERENCES public.events_event(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: quotations_quotation quotations_quotation_provider_id_c97982b3_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotation
    ADD CONSTRAINT quotations_quotation_provider_id_c97982b3_fk_accounts_user_id FOREIGN KEY (provider_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: quotations_quotationrevision quotations_quotation_quotation_id_5da6fa52_fk_quotation; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotationrevision
    ADD CONSTRAINT quotations_quotation_quotation_id_5da6fa52_fk_quotation FOREIGN KEY (quotation_id) REFERENCES public.quotations_quotation(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: quotations_quotationitem quotations_quotation_requirement_id_fcbdda32_fk_events_se; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotationitem
    ADD CONSTRAINT quotations_quotation_requirement_id_fcbdda32_fk_events_se FOREIGN KEY (requirement_id) REFERENCES public.events_servicerequirement(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: quotations_quotationitem quotations_quotation_revision_id_8b23498f_fk_quotation; Type: FK CONSTRAINT; Schema: public; Owner: hiddenstage
--

ALTER TABLE ONLY public.quotations_quotationitem
    ADD CONSTRAINT quotations_quotation_revision_id_8b23498f_fk_quotation FOREIGN KEY (revision_id) REFERENCES public.quotations_quotationrevision(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

\unrestrict sWlMntCjsAFgBtNd7MD09K9Cyl9j6EZ11e4iQ9fk2OW82fbKAFqJYiUOoQ586vf

