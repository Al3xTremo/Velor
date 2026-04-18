interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className="velor-page flex min-h-screen items-center px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}
