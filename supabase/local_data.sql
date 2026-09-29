SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict jdv1rQYQy4ylGidQdw5OQQlOdV9O0JAu9FnvjP7aoCMzaqseza80O27HqPGaYVb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: admin_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "email", "full_name", "avatar_url", "created_at", "updated_at") VALUES
	('6aaec59d-f766-4174-af69-70a7ddb63708', 'vhp04@hotmail.com', '', NULL, '2026-09-23 14:20:54.030778+00', '2026-09-23 14:20:54.030778+00');


--
-- Data for Name: customer_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: provider_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: provider_service_areas; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."service_categories" ("id", "name", "slug", "description", "icon", "image_url", "sort_order", "is_active", "created_at", "updated_at") VALUES
	('64e093e2-d383-433c-8a8b-fd7a5d60fa78', 'Hidráulica', 'hidraulica', 'Reparos, instalações e manutenção hidráulica.', 'droplets', NULL, 3, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('49b9de78-3bdf-48e5-97a0-b146bed6fed1', 'Limpeza', 'limpeza', 'Serviços de limpeza residencial, comercial e pós-obra.', 'sparkles', NULL, 4, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('817805c3-492a-48e5-992a-b610dab476b7', 'Manutenção', 'manutencao', 'Serviços gerais de manutenção residencial e comercial.', 'wrench', NULL, 1, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('110e0c28-6ec3-44d8-aa13-03dfa6afbaaa', 'Jardinagem', 'jardinagem', 'Manutenção, poda e cuidados com jardins e áreas verdes.', 'leaf', NULL, 7, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('379222c5-3c43-410c-8b7f-bea9ce23f865', 'Pintura', 'pintura', 'Pintura residencial, comercial e acabamento.', 'paintbrush', NULL, 5, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('4f54a58a-12a8-4f0b-b6ae-00df7c35251c', 'Marcenaria', 'marcenaria', 'Serviços de marcenaria, móveis planejados e reparos.', 'panel-top', NULL, 11, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('d0ccad64-cad4-4f34-a81d-0cc2350b2631', 'Serviços gerais', 'servicos-gerais', 'Serviços diversos para necessidades do dia a dia.', 'settings', NULL, 12, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('5e21c5da-07e7-4761-aa6b-ec7b31ef3c2e', 'Instalação', 'instalacao', 'Instalação de equipamentos, acessórios e estruturas.', 'hammer', NULL, 9, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('05134507-9f48-4290-82c1-c371f7811fdb', 'Reformas', 'reformas', 'Pequenas reformas e melhorias residenciais e comerciais.', 'construction', NULL, 10, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('135685a2-1163-4077-9f49-dab1e505f8be', 'Ar-condicionado', 'ar-condicionado', 'Instalação, manutenção e higienização de ar-condicionado.', 'air-vent', NULL, 6, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('7bf619fd-4293-4c7b-9bd6-2d6944fae672', 'Elétrica', 'eletrica', 'Instalações, reparos e manutenção elétrica.', 'zap', NULL, 2, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00'),
	('21ce36fc-31d8-423f-854d-ece7eeeb24ac', 'Montagem', 'montagem', 'Montagem e instalação de móveis e equipamentos.', 'package', NULL, 8, true, '2026-09-23 14:09:53.347669+00', '2026-09-23 14:09:53.347669+00');


--
-- Data for Name: provider_service_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: provider_services; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_roles" ("user_id", "role", "created_at", "updated_at") VALUES
	('6aaec59d-f766-4174-af69-70a7ddb63708', 'customer', '2026-09-23 14:20:54.030778+00', '2026-09-23 14:20:54.030778+00');


--
-- PostgreSQL database dump complete
--

-- \unrestrict jdv1rQYQy4ylGidQdw5OQQlOdV9O0JAu9FnvjP7aoCMzaqseza80O27HqPGaYVb

RESET ALL;
