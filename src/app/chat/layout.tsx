import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider>
      {children}
    </MantineProvider>
  );
}