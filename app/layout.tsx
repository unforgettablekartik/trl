export const metadata = {
  title: "The Reader's Lawn — AI Book Summary Generator",
  description: "Search a book, pick a result, and get a 1000-word summary + takeaways + similar reads.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
