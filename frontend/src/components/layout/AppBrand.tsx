import { APP_VERSION_LABEL } from '../../version';

type AppBrandProps = {
  variant?: 'header' | 'login';
};

export function AppBrand({ variant = 'header' }: AppBrandProps) {
  if (variant === 'login') {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary-700">TRIO-SERV</h1>
        <p className="text-xs text-gray-400 mt-1">{APP_VERSION_LABEL}</p>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <h1 className="text-lg font-semibold">TRIO-SERV</h1>
      <span className="text-xs font-medium text-primary-200">{APP_VERSION_LABEL}</span>
    </div>
  );
}
