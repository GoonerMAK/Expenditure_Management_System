--
-- PostgreSQL database dump
--

\restrict 8pcfnoqtJEda2c2DehWjFYePXIysnAUBFLMHHR3D2qxYLYcTFecltuzaZDxBmYo

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

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
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Category" VALUES ('a0337baa-1233-4a6a-b024-a405f2378f86', 'E2E Infrastructure', '2026-10-27 12:34:35.69', '2026-10-27 12:34:35.69');
INSERT INTO public."Category" VALUES ('2395a957-785d-4ccd-8a8b-8a8a80f48e8d', 'E2E C 04573647', '2026-10-27 12:36:13.655', '2026-10-27 12:36:13.655');
INSERT INTO public."Category" VALUES ('a5e40186-aded-4283-8c79-f573e516c52b', 'E2E UI 04576911', '2026-10-27 12:36:17.504', '2026-10-27 12:36:17.504');
INSERT INTO public."Category" VALUES ('abbd094c-024b-4b22-a9b3-096b548a324c', 'E2E C 04612799', '2026-10-27 12:36:52.807', '2026-10-27 12:36:52.807');
INSERT INTO public."Category" VALUES ('f9b98f8c-d186-4cc9-83be-1b0b674580a3', 'E2E UI 04618594', '2026-10-27 12:36:59.259', '2026-10-27 12:36:59.259');
INSERT INTO public."Category" VALUES ('e0bf9c26-daee-467f-a35d-341ce3f996ce', 'E2E C 04646822', '2026-10-27 12:37:26.834', '2026-10-27 12:37:26.834');
INSERT INTO public."Category" VALUES ('8f76f21a-773f-40c3-86d3-57087a41f1d4', 'E2E UI 04650604', '2026-10-27 12:37:31.384', '2026-10-27 12:37:31.384');


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Role" VALUES ('50712453-3257-4df0-8d94-1bb7e6530adf', 'Read-only', NULL, '2026-10-27 12:34:34.889', '2026-10-27 12:34:34.889');
INSERT INTO public."Role" VALUES ('2b83f79d-a252-4f3b-86a2-e5e0dfbcf2e8', 'Administrator', NULL, '2026-10-27 12:34:34.973', '2026-10-27 12:34:34.973');
INSERT INTO public."Role" VALUES ('2ccf42e4-4cc8-48df-8553-939a580efb5c', 'Contributor', NULL, '2026-10-27 12:34:35.273', '2026-10-27 12:34:35.273');
INSERT INTO public."Role" VALUES ('3cc6f493-39d7-425f-9188-ea20ac68ad42', 'E2E Role 1793104533427', NULL, '2026-10-27 12:35:33.445', '2026-10-27 12:35:33.445');
INSERT INTO public."Role" VALUES ('57d44f79-a9e1-4a46-9af2-fdce59a6f1a1', 'E2E Role 1793104573801', NULL, '2026-10-27 12:36:13.808', '2026-10-27 12:36:13.808');
INSERT INTO public."Role" VALUES ('deb621d7-605f-473c-92b6-56691f8134dc', 'E2E Role 1793104612816', NULL, '2026-10-27 12:36:52.825', '2026-10-27 12:36:52.825');
INSERT INTO public."Role" VALUES ('8c62ae32-0571-4c34-ace0-6e439cfaf92d', 'E2E Role 1793104614214', NULL, '2026-10-27 12:36:54.221', '2026-10-27 12:36:54.221');
INSERT INTO public."Role" VALUES ('8a28c931-70dc-4ea8-8dc8-faff3a63b9b5', 'E2E Role 1793104647027', NULL, '2026-10-27 12:37:27.036', '2026-10-27 12:37:27.036');


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."User" VALUES ('c021f0dc-76a6-43e3-9753-d56f5be311fb', 'e2e_admin', '$2b$10$SvjYZWLb7o6n9T/XtwpLA.7oHkfaJHZH8ElwOEbautjhofz/4/VJq', 'e2e.admin@example.com', NULL, NULL, NULL, NULL, '2b83f79d-a252-4f3b-86a2-e5e0dfbcf2e8', '2026-10-27 12:34:34.889', '2026-10-27 12:34:34.889', 'Administrator');
INSERT INTO public."User" VALUES ('bdb7463d-c258-4d8f-a92a-a66754b1697e', 'e2e_contributor', '$2b$10$bGL8R1iHtYN/XkiczWBEtO8yRFHfo7cfBZredF7Pqo.AlIVE7asra', 'e2e.contributor@example.com', NULL, NULL, NULL, NULL, '2ccf42e4-4cc8-48df-8553-939a580efb5c', '2026-10-27 12:34:35.185', '2026-10-27 12:34:35.185', 'Contributor');
INSERT INTO public."User" VALUES ('f4ae98ec-24a1-4cc4-ba88-83481b401d6d', 'e2e_readonly', '$2b$10$pm98JUVbWLRTAo7Jutq68epFspDB10N0PXvEuMRodKUMgXVZidUai', 'e2e.readonly@example.com', NULL, NULL, NULL, NULL, '50712453-3257-4df0-8d94-1bb7e6530adf', '2026-10-27 12:34:35.532', '2026-10-27 12:34:35.532', 'Read-only');


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Project" VALUES ('46f519b0-e6d9-4940-974d-4a1ac5834e65', 'E2E Owner Check 1793104533766 (edited)', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 12:35:33.775', '2026-10-27 12:35:33.796', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('eb4d84cb-dbc5-40d6-87ab-b0e96d88e6cf', 'E2E Owner Check 1793104574026 (edited)', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 12:36:14.034', '2026-10-27 12:36:14.053', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('7c89676c-71f8-456f-83f6-0d5961d33bc7', 'E2E Owner Check 1793104614463', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'c021f0dc-76a6-43e3-9753-d56f5be311fb', '2026-10-27 12:36:54.469', '2026-10-27 12:36:54.469', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('bff7bf2c-46bd-45d2-b27c-986cdf8e2816', 'E2E Owner Check 1793104647282 (edited)', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 12:37:27.291', '2026-10-27 12:37:27.317', 'E2E Infrastructure');


--
-- Data for Name: FinancialData; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."FinancialData" VALUES ('2e275a5b-0b4b-421d-a2d1-1c1f10d6339c', 2026, 1, 1500, 5000, 5500, '46f519b0-e6d9-4940-974d-4a1ac5834e65', '2026-10-27 12:35:33.814', '2026-10-27 12:35:33.814', 'E2E Owner Check 1793104533766 (edited)');
INSERT INTO public."FinancialData" VALUES ('1b9d637b-a02a-40d6-b0ce-512d79fc5ce5', 2026, 1, 1500, 5000, 5500, 'eb4d84cb-dbc5-40d6-87ab-b0e96d88e6cf', '2026-10-27 12:36:14.07', '2026-10-27 12:36:14.07', 'E2E Owner Check 1793104574026 (edited)');
INSERT INTO public."FinancialData" VALUES ('d2a2587e-056b-4c16-825f-99e29cc1a7cd', 2026, 1, 1500, 5000, 5500, 'bff7bf2c-46bd-45d2-b27c-986cdf8e2816', '2026-10-27 12:37:27.335', '2026-10-27 12:37:27.335', 'E2E Owner Check 1793104647282 (edited)');


--
-- PostgreSQL database dump complete
--

\unrestrict 8pcfnoqtJEda2c2DehWjFYePXIysnAUBFLMHHR3D2qxYLYcTFecltuzaZDxBmYo

