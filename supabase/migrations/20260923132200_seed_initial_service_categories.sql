-- =========================================================
-- Porto Serviços
-- Initial Service Categories
-- =========================================================
--
-- Categorias iniciais da plataforma.
--
-- Os ícones utilizam nomes compatíveis com Lucide React.
-- O frontend faz o mapeamento do nome para o componente.
--
-- image_url fica NULL neste primeiro momento.
-- Poderemos adicionar imagens posteriormente pelo painel
-- administrativo.
-- =========================================================


INSERT INTO public.service_categories (
  name,
  slug,
  description,
  icon,
  image_url,
  sort_order,
  is_active
)
SELECT
  v.name,
  v.slug,
  v.description,
  v.icon,
  v.image_url,
  v.sort_order,
  v.is_active
FROM (
  VALUES

    (
      'Manutenção',
      'manutencao',
      'Serviços gerais de manutenção residencial e comercial.',
      'wrench',
      NULL,
      1,
      true
    ),

    (
      'Elétrica',
      'eletrica',
      'Instalações, reparos e manutenção elétrica.',
      'zap',
      NULL,
      2,
      true
    ),

    (
      'Hidráulica',
      'hidraulica',
      'Reparos, instalações e manutenção hidráulica.',
      'droplets',
      NULL,
      3,
      true
    ),

    (
      'Limpeza',
      'limpeza',
      'Serviços de limpeza residencial, comercial e pós-obra.',
      'sparkles',
      NULL,
      4,
      true
    ),

    (
      'Pintura',
      'pintura',
      'Pintura residencial, comercial e acabamento.',
      'paintbrush',
      NULL,
      5,
      true
    ),

    (
      'Ar-condicionado',
      'ar-condicionado',
      'Instalação, manutenção e higienização de ar-condicionado.',
      'air-vent',
      NULL,
      6,
      true
    ),

    (
      'Jardinagem',
      'jardinagem',
      'Manutenção, poda e cuidados com jardins e áreas verdes.',
      'leaf',
      NULL,
      7,
      true
    ),

    (
      'Montagem',
      'montagem',
      'Montagem e instalação de móveis e equipamentos.',
      'package',
      NULL,
      8,
      true
    ),

    (
      'Instalação',
      'instalacao',
      'Instalação de equipamentos, acessórios e estruturas.',
      'hammer',
      NULL,
      9,
      true
    ),

    (
      'Reformas',
      'reformas',
      'Pequenas reformas e melhorias residenciais e comerciais.',
      'construction',
      NULL,
      10,
      true
    ),

    (
      'Marcenaria',
      'marcenaria',
      'Serviços de marcenaria, móveis planejados e reparos.',
      'panel-top',
      NULL,
      11,
      true
    ),

    (
      'Serviços gerais',
      'servicos-gerais',
      'Serviços diversos para necessidades do dia a dia.',
      'settings',
      NULL,
      12,
      true
    )

) AS v(
  name,
  slug,
  description,
  icon,
  image_url,
  sort_order,
  is_active
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.service_categories sc
  WHERE lower(sc.slug) = lower(v.slug)
);


-- =========================================================
-- GARANTIR ORDEM E ATIVAÇÃO DAS CATEGORIAS INICIAIS
-- =========================================================

UPDATE public.service_categories
SET
  sort_order = CASE lower(slug)
    WHEN 'manutencao' THEN 1
    WHEN 'eletrica' THEN 2
    WHEN 'hidraulica' THEN 3
    WHEN 'limpeza' THEN 4
    WHEN 'pintura' THEN 5
    WHEN 'ar-condicionado' THEN 6
    WHEN 'jardinagem' THEN 7
    WHEN 'montagem' THEN 8
    WHEN 'instalacao' THEN 9
    WHEN 'reformas' THEN 10
    WHEN 'marcenaria' THEN 11
    WHEN 'servicos-gerais' THEN 12
    ELSE sort_order
  END
WHERE lower(slug) IN (
  'manutencao',
  'eletrica',
  'hidraulica',
  'limpeza',
  'pintura',
  'ar-condicionado',
  'jardinagem',
  'montagem',
  'instalacao',
  'reformas',
  'marcenaria',
  'servicos-gerais'
);