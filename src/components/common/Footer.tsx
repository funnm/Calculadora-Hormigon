import React from 'react';
import { CheckCircle2, Layers, Lock, Mail } from 'lucide-react';
import {
  APP_NAME,
  APP_VERSION_LABEL,
  LEGAL_LINKS,
  SITE_AUTHOR,
  SUITE_APPS,
  SUITE_NAME,
  SUPPORT_EMAIL,
} from '../../config/site';

interface FooterProps {
  onSelectTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer-pro" aria-label={`Pie de página de ${APP_NAME}`}>
      <div className="app-footer-shell">
        <div className="app-footer-hero">
          <div className="app-footer-brand">
            <div className="app-footer-mark" aria-hidden="true">
              <span>H</span>
            </div>
            <div>
              <div className="app-footer-title-row">
                <strong>{APP_NAME}</strong>
                <span className="footer-version-pill">{APP_VERSION_LABEL}</span>
                <span className="footer-suite-pill">{SUITE_NAME}</span>
              </div>
              <p className="app-footer-desc">
                Plataforma profesional de dosificación de hormigón en obra (Holcim H-140 a H-350), diseño técnico ACI 211.1 / ACI 318, granulometría NTE INEN 696 / ASTM C136, regresión de resistencia y control estadístico.
              </p>
            </div>
          </div>

          <div className="app-footer-status-pills">
            <span className="footer-status-badge ok">
              <CheckCircle2 size={13} /> Motor ACI 211 / INEN Activo
            </span>
            <span className="footer-status-badge">
              <Lock size={13} /> 100% Local y Offline
            </span>
          </div>
        </div>

        <div className="app-footer-grid">
          <div className="footer-col">
            <h4>Módulos de Hormigón</h4>
            <ul>
              <li>
                <button type="button" onClick={() => onSelectTab('dashboard')}>
                  Panel General
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('quick-site')}>
                  Dosificación Rápida en Obra
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('project-info')}>
                  Datos de Obra y Requisitos
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('materials')}>
                  Materiales y Aditivos
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('final-mix')}>
                  Mezcla Final y Humedad
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Calidad y Reportes</h4>
            <ul>
              <li>
                <button type="button" onClick={() => onSelectTab('sieve')}>
                  Granulometría y Curva Fuller
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('strength-curve')}>
                  Regresión de Resistencia
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('strength-control')}>
                  Control Estadístico de Lotes
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('report')}>
                  Reporte Técnico PDF / Excel
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onSelectTab('docs')}>
                  Base Normativa NTE INEN / ACI
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>
              <Layers size={13} /> {SUITE_NAME}
            </h4>
            <ul>
              {SUITE_APPS.map((app) => (
                <li key={app.id}>
                  <span className="footer-suite-item">
                    <strong>{app.name}</strong>
                    <small>{app.current ? 'Activa' : 'Suite'}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal y Soporte</h4>
            <ul>
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="footer-mail-link">
                  <Mail size={12} /> {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="app-footer-bottom">
          <span>
            &copy; {year} <strong>{SITE_AUTHOR}</strong> · {SUITE_NAME}. Todos los derechos reservados.
          </span>
          <span>Web · PWA Offline · Android Nativo</span>
        </div>
      </div>
    </footer>
  );
};
