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
    eyebrow: 'GIỚI THIỆU & HAI CƠ CHẾ',
    accent: 'lime',
    defaultSurface: 'dark',
    docTitle: 'Thuật toán Đom đóm',
  },
  {
    index: 2,
    numLabel: '02',
    path: '/thuat-toan',
    title: 'Thuật toán',
    eyebrow: 'CÔNG THỨC & SƠ ĐỒ 5 BƯỚC',
    accent: 'lime',
    defaultSurface: 'olive',
    docTitle: 'Thuật toán Đom đóm',
  },
  {
    index: 3,
    numLabel: '03',
    path: '/thuc-nghiem',
    title: 'Thực nghiệm',
    eyebrow: 'HỘI TỤ & ĐA CỰC TRỊ',
    accent: 'lime',
    defaultSurface: 'olive',
    docTitle: 'Thuật toán Đom đóm',
  },
  {
    index: 4,
    numLabel: '04',
    path: '/demo',
    title: 'Mô phỏng',
    eyebrow: 'CHẠY THỬ & NÉN ẢNH',
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

export function isSubpageDetailPath(pathname: string): boolean {
  if (pathname.startsWith('/phan-cong')) return true;
  if (pathname.startsWith('/thuc-nghiem/') && pathname !== '/thuc-nghiem/') {
    return true;
  }
  return false;
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
