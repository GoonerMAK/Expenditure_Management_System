--
-- PostgreSQL database dump
--

\restrict jJtIQXMQ2Z3nTPRsG29E6yD1DuPggVZNyEx0TdkkiCdl1L9SvQehc2UvlIH5EVk

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
INSERT INTO public."Category" VALUES ('7c04bce1-c865-4d1d-866b-df5c0d1ba421', 'E2E C 06998235', '2026-10-27 13:16:38.244', '2026-10-27 13:16:38.244');
INSERT INTO public."Category" VALUES ('cb85add3-463e-4fa5-840e-f45d4b2bb4d5', 'E2E C 07155302', '2026-10-27 13:19:15.308', '2026-10-27 13:19:15.308');
INSERT INTO public."Category" VALUES ('cde73cdf-4b72-441a-bbf6-428d1e32c6c0', 'E2E UI 07158711', '2026-10-27 13:19:19.556', '2026-10-27 13:19:19.556');
INSERT INTO public."Category" VALUES ('09cd8118-81bd-4dbe-9158-fba03eff7d4a', 'E2E C 07201837', '2026-10-27 13:20:01.844', '2026-10-27 13:20:01.844');
INSERT INTO public."Category" VALUES ('dacec61a-819b-4211-8a1e-0f93eab679ad', 'E2E UI 07205137', '2026-10-27 13:20:05.749', '2026-10-27 13:20:05.749');


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
INSERT INTO public."Role" VALUES ('af3bf240-4422-42b9-9618-c9ad0acc4b7a', 'E2E Role 1793106998390', NULL, '2026-10-27 13:16:38.398', '2026-10-27 13:16:38.398');
INSERT INTO public."Role" VALUES ('3cd368b9-3e25-4a0d-a7e9-42316edfbc11', 'E2E Role 1793107155447', NULL, '2026-10-27 13:19:15.453', '2026-10-27 13:19:15.453');
INSERT INTO public."Role" VALUES ('ac9ec455-b8e7-49fa-aa4e-e6c07ddaf4f9', 'E2E Role 1793107201973', NULL, '2026-10-27 13:20:01.981', '2026-10-27 13:20:01.981');


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
INSERT INTO public."Project" VALUES ('f353493b-a19a-4f10-846d-26c823ec37e2', 'E2E Budget Within 1793106966041', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:16:06.076', '2026-10-27 13:16:06.076', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('9a1dd1b3-0c31-4de6-a8aa-577866f52b40', 'E2E Budget Over 1793106966839', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:16:06.858', '2026-10-27 13:16:06.858', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('0fa81fc9-5bdf-4393-bb27-a3c00e6f90bc', 'E2E Owner Check 1793106998612 (edited)', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:16:38.621', '2026-10-27 13:16:38.642', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('b0878c5b-2c54-43ab-8c96-8b4a2d42fe06', 'E2E Budget Within 1793107152799', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:19:12.826', '2026-10-27 13:19:12.826', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('9e508983-c60f-4d1c-9f2b-9f753bc70c10', 'E2E Budget Over 1793107153324', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:19:13.345', '2026-10-27 13:19:13.345', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('a72cb24b-21ed-41be-b065-2b5ce5b88b7c', 'E2E Owner Check 1793107155689 (edited)', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:19:15.698', '2026-10-27 13:19:15.714', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('b42f5b8b-059d-4a81-b4b0-b9aa57acd16a', 'E2E Budget Within 1793107199407', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:19:59.436', '2026-10-27 13:19:59.436', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('ded115c3-ad6a-4b6a-9d75-55c78936e5f6', 'E2E Budget Over 1793107200026', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:20:00.05', '2026-10-27 13:20:00.05', 'E2E Infrastructure');
INSERT INTO public."Project" VALUES ('00e69d56-c2c4-4dc4-8355-828b60df9960', 'E2E Owner Check 1793107202197 (edited)', NULL, 'a0337baa-1233-4a6a-b024-a405f2378f86', NULL, NULL, 'bdb7463d-c258-4d8f-a92a-a66754b1697e', '2026-10-27 13:20:02.204', '2026-10-27 13:20:02.217', 'E2E Infrastructure');


--
-- Data for Name: FinancialData; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."FinancialData" VALUES ('2e275a5b-0b4b-421d-a2d1-1c1f10d6339c', 2026, 1, 1500, 5000, 5500, '46f519b0-e6d9-4940-974d-4a1ac5834e65', '2026-10-27 12:35:33.814', '2026-10-27 12:35:33.814', 'E2E Owner Check 1793104533766 (edited)');
INSERT INTO public."FinancialData" VALUES ('1b9d637b-a02a-40d6-b0ce-512d79fc5ce5', 2026, 1, 1500, 5000, 5500, 'eb4d84cb-dbc5-40d6-87ab-b0e96d88e6cf', '2026-10-27 12:36:14.07', '2026-10-27 12:36:14.07', 'E2E Owner Check 1793104574026 (edited)');
INSERT INTO public."FinancialData" VALUES ('d2a2587e-056b-4c16-825f-99e29cc1a7cd', 2026, 1, 1500, 5000, 5500, 'bff7bf2c-46bd-45d2-b27c-986cdf8e2816', '2026-10-27 12:37:27.335', '2026-10-27 12:37:27.335', 'E2E Owner Check 1793104647282 (edited)');
INSERT INTO public."FinancialData" VALUES ('05ef2f64-e639-4362-847d-f68631435300', 2026, 3, 1200, 2000, 3000, 'f353493b-a19a-4f10-846d-26c823ec37e2', '2026-10-27 13:16:06.102', '2026-10-27 13:16:06.102', 'E2E Budget Within 1793106966041');
INSERT INTO public."FinancialData" VALUES ('9741cda5-d875-43c4-9bef-2d7f93badcd1', 2026, 3, 1500, 1000, 0, '9a1dd1b3-0c31-4de6-a8aa-577866f52b40', '2026-10-27 13:16:06.878', '2026-10-27 13:16:06.878', 'E2E Budget Over 1793106966839');
INSERT INTO public."FinancialData" VALUES ('9a10dc77-6267-42e0-b649-41f38cb49301', 2026, 1, 1500, 5000, 5500, '0fa81fc9-5bdf-4393-bb27-a3c00e6f90bc', '2026-10-27 13:16:38.661', '2026-10-27 13:16:38.661', 'E2E Owner Check 1793106998612 (edited)');
INSERT INTO public."FinancialData" VALUES ('85bed0a7-d5af-43de-aa3a-b431d4717290', 2026, 3, 1200, 2000, 3000, 'b0878c5b-2c54-43ab-8c96-8b4a2d42fe06', '2026-10-27 13:19:12.852', '2026-10-27 13:19:12.852', 'E2E Budget Within 1793107152799');
INSERT INTO public."FinancialData" VALUES ('9878afb0-7d3f-4c81-b7b7-dc5008e9e299', 2026, 3, 1500, 1000, 0, '9e508983-c60f-4d1c-9f2b-9f753bc70c10', '2026-10-27 13:19:13.372', '2026-10-27 13:19:13.372', 'E2E Budget Over 1793107153324');
INSERT INTO public."FinancialData" VALUES ('5f06f4d6-8e8b-4685-a7c2-20d04763cb18', 2026, 1, 1500, 5000, 5500, 'a72cb24b-21ed-41be-b065-2b5ce5b88b7c', '2026-10-27 13:19:15.728', '2026-10-27 13:19:15.728', 'E2E Owner Check 1793107155689 (edited)');
INSERT INTO public."FinancialData" VALUES ('cb243e1a-8753-45c3-9736-2737a05c8fa1', 2026, 3, 1200, 2000, 3000, 'b42f5b8b-059d-4a81-b4b0-b9aa57acd16a', '2026-10-27 13:19:59.464', '2026-10-27 13:19:59.464', 'E2E Budget Within 1793107199407');
INSERT INTO public."FinancialData" VALUES ('5d7f20e6-e8f5-47b6-9bfd-11fc164081f0', 2026, 3, 1500, 1000, 0, 'ded115c3-ad6a-4b6a-9d75-55c78936e5f6', '2026-10-27 13:20:00.08', '2026-10-27 13:20:00.08', 'E2E Budget Over 1793107200026');
INSERT INTO public."FinancialData" VALUES ('67453e17-a48f-46a5-a9d3-2c5c2d3c7b8a', 2026, 1, 1500, 5000, 5500, '00e69d56-c2c4-4dc4-8355-828b60df9960', '2026-10-27 13:20:02.231', '2026-10-27 13:20:02.231', 'E2E Owner Check 1793107202197 (edited)');


--
-- PostgreSQL database dump complete
--

\unrestrict jJtIQXMQ2Z3nTPRsG29E6yD1DuPggVZNyEx0TdkkiCdl1L9SvQehc2UvlIH5EVk

