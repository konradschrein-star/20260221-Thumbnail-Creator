'use client';

import InfiniteLoom from './landing-concepts/InfiniteLoom';

export default function Home() {
  return (
    <main className="titan-showcase">
      <div className="viewport">
        <InfiniteLoom />
      </div>

      <style jsx>{`
        .titan-showcase {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: #000;
          overflow: hidden;
        }

        .viewport {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </main>
  );
}
