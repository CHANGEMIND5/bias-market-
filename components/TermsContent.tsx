"use client";

import Link from "next/link";
import LangSwitcher from "./LangSwitcher";
import ThemeToggle from "./ThemeToggle";
import { Lang, useLang } from "@/lib/i18n";

// 이용약관 3개 언어 본문 — 수정은 이 파일에서
interface TermsText {
  back: string;
  title: string;
  intro: string;
  sections: [string, string[]][];
}

function content(contact: string): Record<Lang, TermsText> {
  return {
    ko: {
      back: "← Bias Market으로 돌아가기",
      title: "이용약관",
      intro:
        "Bias Market(이하 “서비스”)은 비공식 팬메이드 K-pop 팬덤 트레이딩 시뮬레이터입니다. 서비스를 이용함으로써 아래 약관에 동의하는 것으로 간주됩니다.",
      sections: [
        [
          "1. 서비스의 성격",
          [
            "본 서비스는 오락 목적의 가상 시뮬레이션입니다. Fan$와 Fan Shares는 서비스 내부에서만 사용되는 가상 요소이며 실제 금전적 가치가 없습니다.",
            "가상 자산은 예치·인출·환전·양도·판매할 수 없으며, 증권·투자·도박 상품이 아닙니다.",
            "마켓 가격·변동률·랭킹은 내부 시뮬레이션 결과이며 실제 인기·매출·팬덤 규모·아티스트 가치를 의미하지 않습니다.",
          ],
        ],
        [
          "2. 공식 제휴 아님",
          [
            "본 서비스는 어떤 아티스트·소속사·레이블·엔터테인먼트 회사와도 제휴·후원·보증·공식 연관 관계가 없습니다.",
            "그룹명·팬덤명은 식별 목적으로만 사용되며, 공식 사진·로고는 사용하지 않습니다.",
          ],
        ],
        [
          "3. 계정",
          [
            "구글 로그인으로 계정을 생성하며, 본인 계정의 활동에 대한 책임은 이용자에게 있습니다.",
            "1인당 다수 계정을 만들어 보상·투표·랭킹을 조작하는 행위는 금지됩니다.",
          ],
        ],
        [
          "4. 커뮤니티 규칙",
          [
            "아티스트·멤버·팬덤 비하, 혐오·차별 발언, 위협, 개인정보 공개, 도배, 사칭, 공식 제휴 사칭은 금지됩니다.",
            "‘다 같이 팔자’, ‘가격 내리자’ 등 조직적 시세 조작 유도, 수익·가격 보장 주장, 추천·사기 링크 게시는 금지됩니다.",
            "운영자는 규칙 위반 콘텐츠를 숨기거나 삭제하고, 위반 계정의 활동을 제한할 수 있습니다.",
          ],
        ],
        [
          "5. 금지 행위",
          [
            "서비스의 정상 운영을 방해하는 자동화·해킹·취약점 악용·과도한 요청(어뷰징)은 금지됩니다.",
            "리워드·미션·스타터 보상·랭킹을 부정한 방법으로 취득하려는 시도는 계정 제한 사유가 됩니다.",
          ],
        ],
        [
          "6. 면책",
          [
            "본 서비스는 “있는 그대로” 제공되며, 서비스 중단·데이터 손실·오류에 대해 법이 허용하는 범위에서 책임을 지지 않습니다.",
            "가상 자산은 실제 가치가 없으므로 잔액·보유·랭킹의 변동으로 인한 손해 배상 청구는 인정되지 않습니다.",
            "베타 기간 중에는 기능·데이터가 예고 없이 변경되거나 초기화될 수 있습니다.",
          ],
        ],
        [
          "7. 문의 및 변경",
          [
            `약관·서비스 관련 문의는 ${contact}(으)로 연락해 주세요.`,
            "약관 변경 사항은 이 페이지 또는 서비스 내 공지로 안내합니다.",
            "시행일: 2026-07-17",
          ],
        ],
      ],
    },
    en: {
      back: "← Back to Bias Market",
      title: "Terms of Service",
      intro:
        "Bias Market (the “Service”) is an unofficial, fan-made K-pop fandom trading simulator. By using the Service you agree to the terms below.",
      sections: [
        [
          "1. Nature of the Service",
          [
            "This is an entertainment-only virtual simulation. Fan$ and Fan Shares are virtual elements used only inside the Service and have no real-world monetary value.",
            "Virtual assets cannot be deposited, withdrawn, exchanged, transferred, or sold, and are not securities, investments, or gambling products.",
            "Prices, changes, and rankings are simulation results and do not represent real popularity, revenue, fandom size, or artist value.",
          ],
        ],
        [
          "2. No Official Affiliation",
          [
            "The Service is not affiliated with, endorsed by, sponsored by, or officially connected to any artist, agency, label, or entertainment company.",
            "Group and fandom names are used for identification only; no official photos or logos are used.",
          ],
        ],
        [
          "3. Accounts",
          [
            "Accounts are created via Google sign-in; you are responsible for activity on your account.",
            "Creating multiple accounts to manipulate rewards, votes, or rankings is prohibited.",
          ],
        ],
        [
          "4. Community Rules",
          [
            "Harassment of artists, members, or fandoms, hate speech, threats, personal information, spam, impersonation, and false claims of official affiliation are prohibited.",
            "Coordinated market manipulation (“everyone sell,” “let’s crash the price”), guaranteed price/profit claims, and referral or scam links are prohibited.",
            "Admins may hide or delete violating content and restrict violating accounts.",
          ],
        ],
        [
          "5. Prohibited Conduct",
          [
            "Automation, hacking, exploiting vulnerabilities, and excessive requests that disrupt normal operation are prohibited.",
            "Attempts to obtain rewards, missions, starter grants, or rankings by illegitimate means may lead to account restriction.",
          ],
        ],
        [
          "6. Disclaimer",
          [
            "The Service is provided “as is,” without liability for interruptions, data loss, or errors, to the extent permitted by law.",
            "Because virtual assets have no real value, no claim for damages arising from changes in balances, holdings, or rankings is recognized.",
            "During beta, features and data may change or be reset without notice.",
          ],
        ],
        [
          "7. Contact & Changes",
          [
            `For questions about these terms or the Service, contact ${contact}.`,
            "Changes to these terms will be announced on this page or via in-service notices.",
            "Effective date: 2026-07-17",
          ],
        ],
      ],
    },
    es: {
      back: "← Volver a Bias Market",
      title: "Términos de servicio",
      intro:
        "Bias Market (el “Servicio”) es un simulador de trading de fandoms K-pop no oficial hecho por fans. Al usar el Servicio aceptas los términos siguientes.",
      sections: [
        [
          "1. Naturaleza del Servicio",
          [
            "Es una simulación virtual solo con fines de entretenimiento. Fan$ y Fan Shares son elementos virtuales usados solo dentro del Servicio y no tienen valor monetario real.",
            "Los activos virtuales no pueden depositarse, retirarse, canjearse, transferirse ni venderse, y no son valores, inversiones ni productos de apuestas.",
            "Precios, variaciones y rankings son resultados de simulación y no representan popularidad, ingresos, tamaño de fandom ni valor del artista reales.",
          ],
        ],
        [
          "2. Sin afiliación oficial",
          [
            "El Servicio no está afiliado, respaldado ni patrocinado por ningún artista, agencia, sello o empresa de entretenimiento.",
            "Los nombres de grupos y fandoms se usan solo para identificación; no se usan fotos ni logos oficiales.",
          ],
        ],
        [
          "3. Cuentas",
          [
            "Las cuentas se crean con inicio de sesión de Google; eres responsable de la actividad de tu cuenta.",
            "Crear varias cuentas para manipular recompensas, votos o rankings está prohibido.",
          ],
        ],
        [
          "4. Reglas de la comunidad",
          [
            "Se prohíben el acoso a artistas, miembros o fandoms, el discurso de odio, las amenazas, la información personal, el spam, la suplantación y las falsas afirmaciones de afiliación oficial.",
            "Se prohíben la manipulación coordinada del mercado (“vendamos todos”, “bajemos el precio”), las promesas de precio/beneficio y los enlaces de referidos o estafa.",
            "Los administradores pueden ocultar o eliminar contenido infractor y restringir cuentas infractoras.",
          ],
        ],
        [
          "5. Conducta prohibida",
          [
            "Se prohíben la automatización, el hacking, la explotación de vulnerabilidades y las solicitudes excesivas que alteren el funcionamiento normal.",
            "Los intentos de obtener recompensas, misiones, premios iniciales o rankings por medios ilegítimos pueden conllevar la restricción de la cuenta.",
          ],
        ],
        [
          "6. Descargo de responsabilidad",
          [
            "El Servicio se ofrece “tal cual”, sin responsabilidad por interrupciones, pérdida de datos o errores, en la medida que permita la ley.",
            "Como los activos virtuales no tienen valor real, no se reconoce ninguna reclamación por daños derivados de cambios en saldos, posesiones o rankings.",
            "Durante la beta, las funciones y los datos pueden cambiar o reiniciarse sin aviso.",
          ],
        ],
        [
          "7. Contacto y cambios",
          [
            `Para consultas sobre estos términos o el Servicio, contacta a ${contact}.`,
            "Los cambios de estos términos se anunciarán en esta página o mediante avisos en el servicio.",
            "Fecha de vigencia: 2026-07-17",
          ],
        ],
      ],
    },
  };
}

export default function TermsContent({ contact }: { contact: string }) {
  const { lang, t } = useLang();
  const c = content(contact)[lang];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[760px] p-4 lg:p-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-800">
            {c.back}
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitcher compact />
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-card p-6 lg:p-8">
          <h1 className="text-xl font-extrabold">{c.title}</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{c.intro}</p>

          {c.sections.map(([title, items]) => (
            <section key={title} className="mt-6">
              <h2 className="text-sm font-bold">{title}</h2>
              <ul className="mt-2 space-y-1.5">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="text-[13px] text-gray-600 leading-relaxed pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-gray-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="mt-8 pt-4 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
