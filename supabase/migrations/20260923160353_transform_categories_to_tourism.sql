-- ============================================================
-- PORTO SERVIÇOS
-- Transformação definitiva para marketplace de turismo
-- Porto Seguro - Bahia
-- ============================================================

begin;

-- ============================================================
-- 1. DESATIVA AS CATEGORIAS ANTIGAS
-- ============================================================

update public.service_categories
set
  is_active = false,
  updated_at = now()
where is_active = true;

-- ============================================================
-- 2. CATEGORIAS OFICIAIS DE TURISMO
-- ============================================================

insert into public.service_categories (
  name,
  slug,
  description,
  icon,
  is_active,
  sort_order
)
values

  (
    'Passeios & Experiências',
    'passeios-experiencias',
    'Passeios, roteiros turísticos, experiências locais e atividades para conhecer Porto Seguro e região.',
    'compass',
    true,
    10
  ),

  (
    'Praias & Barracas',
    'praias-barracas',
    'Barracas de praia, beach clubs, estruturas de lazer e experiências à beira-mar.',
    'palmtree',
    true,
    20
  ),

  (
    'Gastronomia',
    'restaurantes-gastronomia',
    'Restaurantes, gastronomia regional e experiências gastronômicas em Porto Seguro.',
    'utensils-crossed',
    true,
    30
  ),

  (
    'Bares & Vida Noturna',
    'bares-vida-noturna',
    'Bares, entretenimento noturno e lugares para aproveitar a noite em Porto Seguro.',
    'martini',
    true,
    40
  ),

  (
    'Música ao Vivo & Eventos',
    'musica-ao-vivo',
    'Música ao vivo, apresentações, festas e eventos para aproveitar durante a viagem.',
    'music-2',
    true,
    50
  ),

  (
    'Transfers & Transporte',
    'transfers-transporte',
    'Transfers, transporte turístico, deslocamentos e serviços de mobilidade para visitantes.',
    'car',
    true,
    60
  ),

  (
    'Barcos & Escunas',
    'barcos-escunas',
    'Passeios de barco, escunas e experiências náuticas pela região.',
    'ship',
    true,
    70
  ),

  (
    'Mergulho & Aventura',
    'mergulho-aventura',
    'Mergulho, atividades aquáticas, aventura e experiências para quem busca emoção.',
    'waves',
    true,
    80
  ),

  (
    'Aluguel de Carros & Motos',
    'aluguel-carros-motos',
    'Locação de veículos para turistas explorarem Porto Seguro e seus arredores.',
    'bike',
    true,
    90
  ),

  (
    'Ingressos & Eventos',
    'ingressos-eventos',
    'Ingressos e acesso a atrações, festas, shows e experiências turísticas.',
    'ticket',
    true,
    100
  ),

  (
    'Fotografia & Ensaios',
    'fotografia-ensaios',
    'Fotógrafos, ensaios de viagem, casais, famílias e registros especiais em Porto Seguro.',
    'camera',
    true,
    110
  ),

  (
    'Bem-estar & Massagem',
    'bem-estar',
    'Massagens, relaxamento, terapias e experiências de bem-estar durante a viagem.',
    'sparkles',
    true,
    120
  )

on conflict (lower(slug))
do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
commit;