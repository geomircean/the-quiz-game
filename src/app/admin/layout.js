const Layout = ({ children }) => (
  <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
    <div className="container mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        {children}
      </div>
    </div>
  </main>
);

export default Layout;
