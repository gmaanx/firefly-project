export type AppRoutePath = '/' | '/thuat-toan' | '/thuc-nghiem' | '/demo';

export type SurfaceTheme = 'light' | 'olive' | 'sage' | 'dark';

export interface RouteNavItem {
  index: 1 | 2 | 3 | 4;
  numLabel: string;
  path: AppRoutePath;
  title: string;
  eyebrow: string;
  accent: 'lime' | 'violet';
  defaultSurface: SurfaceTheme;
  docTitle: string;
}

export const APP_ROUTES: readonly RouteNavItem[] = [
  {
    index: 1,
    numLabel: '01',
    path: '/',
    title: 'Trang chủ',
    eyebrow: 'GIỚI THIỆU & HAI CƠ CHẾ CỐT LÕI',
    accent: 'lime',
    defaultSurface: 'dark',
    docTitle: 'Thuật toán Đom đóm',
  },
  {
    index: 2,
    numLabel: '02',
    path: '/thuat-toan',
    title: 'Nguyên lý thuật toán',
    eyebrow: 'CÔNG THỨC CẬP NHẬT · SƠ ĐỒ 5 BƯỚC & VÍ DỤ 3D',
    accent: 'lime',
    defaultSurface: 'olive',
    docTitle: 'Thuật toán Đom đóm',
  },
  {
    index: 3,
    numLabel: '03',
    path: '/thuc-nghiem',
    title: 'Kết quả thực nghiệm',
    eyebrow: 'TỐC ĐỘ HỘI TỤ · CHI PHÍ O(N²) & TÁCH NHÓM ĐA CỰC TRỊ',
    accent: 'lime',
    defaultSurface: 'olive',
    docTitle: 'Thuật toán Đom đóm',
  },
  {
    index: 4,
    numLabel: '04',
    path: '/demo',
    title: 'Mô phỏng & Nén ảnh',
    eyebrow: 'CHẠY THỬ 7 HÀM CHUẨN · ỨNG DỤNG NÉN ẢNH RGB',
    accent: 'violet',
    defaultSurface: 'dark',
    docTitle: 'Thuật toán Đom đóm',
  },
] as const;

export const ROUTE_KEY_MAP: Record<string, AppRoutePath> = {
  '1': '/',
  '2': '/thuat-toan',
  '3': '/thuc-nghiem',
  '4': '/demo',
};

export function normalizeRoutePath(pathname: string): AppRoutePath {
  if (pathname.startsWith('/thuat-toan')) return '/thuat-toan';
  if (pathname.startsWith('/thuc-nghiem')) return '/thuc-nghiem';
  if (pathname.startsWith('/demo')) return '/demo';
  return '/';
}

export function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="slider"], [data-local-keys="true"]'
    )
  ) {
    return true;
  }
  return false;
}
