// The app's logo (the cat with the basket, same as the app icon)
import logo from './logo.png';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden>
      <img src={logo} alt="" width={32} height={32} />
    </span>
  );
}
