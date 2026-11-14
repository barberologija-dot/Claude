export type Shop = {
  id: string; slug: string; name: string; description: string; logo_url: string | null;
  phone: string; email: string; max_days_ahead: number; min_notice_minutes: number;
  cancel_deadline_hours: number; slot_minutes: number; max_active_per_customer: number; active: boolean;
};
export type Location = { id: string; shop_id: string; name: string; address: string; city: string; phone: string; timezone: string; active: boolean; sort: number };
export type LocationHours = { location_id: string; shop_id: string; weekday: number; opens: string; closes: string };
export type LocationBreak = { id: string; location_id: string; shop_id: string; weekday: number; starts: string; ends: string };
export type Service = { id: string; shop_id: string; name: string; description: string; image_url: string | null; duration_min: number; price: number; active: boolean; sort: number };
export type Barber = { id: string; shop_id: string; location_id: string; name: string; photo_url: string | null; active: boolean; sort: number };
export type BarberHours = { barber_id: string; shop_id: string; weekday: number; works: boolean; starts: string | null; ends: string | null };
export type BarberService = { barber_id: string; service_id: string; shop_id: string };
export type DayOff = { id: string; shop_id: string; location_id: string; barber_id: string | null; date_from: string; date_to: string; note: string };
export type AppointmentStatus = 'booked' | 'completed' | 'no_show' | 'cancelled';
export type Appointment = {
  id: string; shop_id: string; location_id: string; barber_id: string; service_id: string;
  customer_id: string | null; customer_name: string; customer_phone: string;
  starts_at: string; ends_at: string; status: AppointmentStatus; price: number; note: string;
  cancelled_by: 'customer' | 'shop' | null;
};
export type Profile = { id: string; full_name: string; phone: string; locale: string; notify_email: boolean; is_platform_owner: boolean };
export type Slot = { slot: string; barber: string };

export type Catalog = {
  locations: Location[]; hours: LocationHours[]; services: Service[];
  barbers: Barber[]; barberServices: BarberService[];
};
