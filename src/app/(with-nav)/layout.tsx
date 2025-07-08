import { Navigation } from '@/components/Navigation';

export default function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}