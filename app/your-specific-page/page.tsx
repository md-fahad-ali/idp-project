export default function SpecificPage() {
  return (
    <div className="specific-page-container">
      <h1 className="text-2xl font-bold mb-4">Specific Page</h1>
      <p>This page uses its own styling without globals.css</p>
      
      <div className="mt-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Custom Styled Content</h2>
        <p>This content has styling from page-styles.css only.</p>
      </div>
    </div>
  );
} 