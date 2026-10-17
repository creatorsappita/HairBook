export default function Home() {
  const services = [
    {
      icon: "✂",
      name: "Shampoo e taglio",
      duration: "30 minuti",
      price: "€ 25",
      active: true,
    },
    {
      icon: "◆",
      name: "Taglio e barba",
      duration: "45 minuti",
      price: "€ 35",
      active: false,
    },
    {
      icon: "●",
      name: "Barba",
      duration: "15 minuti",
      price: "€ 12",
      active: false,
    },
  ];

  const features = [
    {
      number: "01",
      title: "Scegli il servizio",
      description:
        "Visualizza i servizi disponibili, la durata prevista e il relativo prezzo.",
    },
    {
      number: "02",
      title: "Trova l’orario",
      description:
        "Consulta esclusivamente gli orari realmente disponibili nel calendario.",
    },
    {
      number: "03",
      title: "Conferma la prenotazione",
      description:
        "Prenota il tuo appuntamento e ricevi immediatamente la conferma.",
    },
  ];

  return (
    <main className="home-page">
      <header className="header">
        #
          <span className="logo-mark">HB</span>
          <span>HairBook</span>
        </a>

        <nav className="navigation">
          #come-funzionaCome funziona</a>
          #serviziServizi</a>
          #parrucchieriPer i parrucchieri</a>
        </nav>

        <div className="header-actions">
          /login
            Accedi
          </a>

          /registrazione
            Registrati
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span>●</span>
            Prenotazioni semplici e veloci
          </div>

          <h1>
            Il tuo stile,
            <br />
            al momento <span>giusto.</span>
          </h1>

          <p className="hero-description">
            Prenota taglio, barba e trattamenti in pochi passaggi. HairBook
            mostra soltanto gli orari realmente disponibili nel tuo salone.
          </p>

          <div className="hero-buttons">
            /prenota
              Prenota un appuntamento
            </a>

            #come-funziona
              Scopri come funziona
            </a>
          </div>

          <div className="hero-features">
            <div className="hero-feature">
              <span className="check">✓</span>
              Prenotazione online
            </div>

            <div className="hero-feature">
              <span className="check">✓</span>
              Disponibilità aggiornata
            </div>

            <div className="hero-feature">
              <span className="check">✓</span>
              Conferma immediata
            </div>
          </div>
        </div>

        <div className="booking-preview" id="servizi">
          <div className="booking-decoration"></div>
          <div className="booking-decoration-small"></div>

          <div className="booking-card">
            <div className="booking-card-header">
              <div>
                <h2>Prenota il servizio</h2>
                <p>Scegli il trattamento desiderato</p>
              </div>

              <span className="status">Aperto</span>
            </div>

            <div className="service-list">
              {services.map((service) => (
                <div
                  className={`service-card ${
                    service.active ? "active" : ""
                  }`}
                  key={service.name}
                >
                  <div className="service-icon">{service.icon}</div>

                  <div className="service-info">
                    <h3>{service.name}</h3>
                    <p>{service.duration}</p>
                  </div>

                  <div className="service-price">{service.price}</div>
                </div>
              ))}
            </div>

            <h3 className="times-title">Orari disponibili</h3>

            <div className="time-list">
              <div className="time">09:00</div>
              <div className="time active">09:30</div>
              <div className="time">10:00</div>
              <div className="time">10:30</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-white" id="come-funziona">
        <div className="section-heading">
          <small>Come funziona</small>

          <h2>Il tuo appuntamento in tre passaggi</h2>

          <p>
            Niente telefonate e nessuna attesa. Scegli il servizio, consulta
            gli orari disponibili e conferma la prenotazione.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-number">{feature.number}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="parrucchieri">
        <div className="section-heading">
          <small>Per il tuo salone</small>

          <h2>Tutta l’agenda sotto controllo</h2>

          <p>
            Gestisci servizi, durate, orari di apertura, clienti approvati e
            appuntamenti da un’unica area riservata.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-number">✂</div>
            <h3>Servizi personalizzati</h3>
            <p>
              Crea ogni lavorazione indicando nome, durata, prezzo e operatori
              abilitati.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-number">◷</div>
            <h3>Orari flessibili</h3>
            <p>
              Imposta giorni di apertura, pause, ferie e chiusure
              straordinarie.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-number">✓</div>
            <h3>Clienti verificati</h3>
            <p>
              Approva ogni nuova iscrizione prima di consentire la
              prenotazione.
            </p>
          </article>
        </div>
      </section>

      <section className="cta">
        <h2>Il prossimo appuntamento è a pochi clic.</h2>

        <p>
          Registrati gratuitamente, attendi l’approvazione del salone e
          prenota il servizio nell’orario che preferisci.
        </p>

        /registrazione
          Crea il tuo account
        </a>
      </section>

      <footer className="footer">
        <strong>HairBook</strong>
        <span>Gestionale prenotazioni per parrucchieri</span>
        <span>© 2026 HairBook</span>
      </footer>
    </main>
  );
}
