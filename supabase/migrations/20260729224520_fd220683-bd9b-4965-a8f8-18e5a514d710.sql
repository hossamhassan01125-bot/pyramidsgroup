CREATE TYPE public.app_role AS ENUM ('admin','client');
CREATE TYPE public.property_type AS ENUM ('land','apartment','villa','office');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE SEQUENCE public.property_ref_seq START 1001;

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('EG-' || nextval('public.property_ref_seq')),
  title text NOT NULL,
  type public.property_type NOT NULL,
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  description text,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'مصر',
  image_url text,
  area_sqm integer,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in users can view properties" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage properties" ON public.properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  visit_date date,
  notes text,
  status public.booking_status NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients read own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clients create own bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients update own bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clients delete own bookings" ON public.bookings FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.properties (title, type, price, description, city, country, image_url, area_sqm) VALUES
('فيلا فاخرة في التجمع الخامس','villa',12500000,'فيلا مستقلة بحديقة خاصة وحمام سباحة، 5 غرف نوم و6 حمامات، تشطيب سوبر لوكس.','القاهرة','مصر','https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',450),
('شقة بإطلالة على النيل - الزمالك','apartment',6800000,'شقة 220 متر بإطلالة مباشرة على النيل، 3 غرف نوم، دور عالٍ ومصعد خاص.','القاهرة','مصر','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',220),
('شقة بحرية في سموحة','apartment',3200000,'شقة 165 متر بموقع متميز في سموحة، تشطيب كامل وقريبة من الخدمات.','الإسكندرية','مصر','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',165),
('أرض سكنية في الشيخ زايد','land',4500000,'قطعة أرض 600 متر على شارعين، مرخصة للبناء السكني، بموقع هادئ.','الجيزة','مصر','https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',600),
('فيلا على البحر في الساحل الشمالي','villa',9800000,'فيلا في قرية سياحية على البحر مباشرة، مفروشة بالكامل مع تراس واسع.','مرسى مطروح','مصر','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',300),
('مكتب إداري في وسط البلد','office',2750000,'مكتب 140 متر في برج إداري، مناسب للشركات الناشئة، مع موقف سيارات.','القاهرة','مصر','https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',140),
('شقة عائلية في المنصورة','apartment',1450000,'شقة 150 متر، 3 غرف نوم، قريبة من جامعة المنصورة والخدمات.','المنصورة','مصر','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',150),
('أرض زراعية في الفيوم','land',900000,'5 أفدنة أرض زراعية خصبة مع مصدر ري دائم وطريق ممهد.','الفيوم','مصر','https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=1200&q=80',21000),
('فيلا في مدينة الشروق','villa',7200000,'فيلا دوبلكس 380 متر بحديقة 200 متر، تشطيب حديث وأمن على مدار الساعة.','القاهرة','مصر','https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',380),
('مكتب بإطلالة بحرية في الغردقة','office',1980000,'مكتب 110 متر في منطقة تجارية نشطة بالغردقة، مناسب لشركات السياحة.','الغردقة','مصر','https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80',110);