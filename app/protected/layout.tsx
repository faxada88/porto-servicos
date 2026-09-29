export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#101828]">
      {children}
    </main>
  );
}
