// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";
import MainNav from "../components/MainNav";
import "./home-hero.css";

export default function Home() {
  const nav = useNavigate();

  return (
    <div className="hero">
      {/* 상단 공통 메뉴 */}
      <MainNav />

      <section className="hero-visual">
        <main className="hero-main">
          <p className="badge">AI 실시간 운동코칭</p>
          <h1 className="title">
            나에게 딱 맞는 <span className="hl">홈트 파트너</span>
          </h1>
          <h1 className="homeStepUp">StepUp</h1>

          <div className="cta-row">
            {/* 스토어 버튼 등 필요하면 여기 */}
          </div>
        </main>
      </section>
    </div>
  );
}
