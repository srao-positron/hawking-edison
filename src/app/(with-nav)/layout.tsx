import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Navigation } from '@/components/Navigation';

export default function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider>
      <Navigation />
      {children}
    </MantineProvider>
  );
}