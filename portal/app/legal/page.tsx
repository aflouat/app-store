export const metadata = { title: 'Mentions légales — perform-learn.fr' }

export default function LegalPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <h1 className="legal-title">Mentions légales</h1>

        <section>
          <h2>Éditeur du site</h2>
          <p>
            <strong>EMMAEINNA Aminetou</strong><br />
            Micro-entreprise — SIREN : 103 082 673<br />
            Adresse : [ADRESSE]<br />
            Email : <a href="mailto:contact@perform-learn.fr">contact@perform-learn.fr</a><br />
            Directeur de la publication : Abdel Flouat
          </p>
        </section>

        <section>
          <h2>Hébergement</h2>
          <p>
            <strong>Front-end (portal.perform-learn.fr)</strong><br />
            Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, USA
          </p>
          <p>
            <strong>Back-end, base de données et fichiers (api.perform-learn.fr, s3.perform-learn.fr)</strong><br />
            OVH SAS — 2 rue Kellermann, 59100 Roubaix, France
          </p>
        </section>

        <section>
          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur perform-learn.fr (textes, images, logos, algorithmes,
            code source) sont la propriété exclusive de EMMAEINNA Aminetou et protégés par les lois
            françaises et internationales relatives à la propriété intellectuelle. Toute reproduction,
            même partielle, est strictement interdite sans autorisation écrite préalable.
          </p>
        </section>

        <section>
          <h2>Données personnelles</h2>
          <p>
            Pour toute information relative au traitement de vos données personnelles, consultez notre{' '}
            <a href="/freelancehub/privacy">Politique de confidentialité</a> ou contactez-nous à{' '}
            <a href="mailto:contact@perform-learn.fr">contact@perform-learn.fr</a>.
          </p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            Ce site utilise uniquement des cookies de session nécessaires à l'authentification. Aucun
            cookie publicitaire ou de suivi tiers n'est utilisé. Les analytics sont assurés par Umami
            en mode respectueux de la vie privée (sans cookie tiers, données hébergées en France).
          </p>
        </section>

        <section>
          <h2>Droit applicable</h2>
          <p>
            Le présent site est soumis au droit français. Tout litige relatif à son utilisation sera
            soumis à la compétence exclusive des tribunaux français.
          </p>
        </section>
      </div>

      <style>{`
        .legal-page { min-height: 100vh; background: var(--bg); padding: 3rem 1rem; }
        .legal-inner { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.8rem; }
        .legal-title { font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 700; color: var(--dark); }
        .legal-inner section { display: flex; flex-direction: column; gap: .75rem; }
        .legal-inner h2 { font-size: 1.05rem; font-weight: 700; color: var(--dark); border-bottom: 1px solid var(--border); padding-bottom: .4rem; }
        .legal-inner p, .legal-inner li { font-size: .93rem; color: var(--text); line-height: 1.7; }
        .legal-inner ul { padding-left: 1.4rem; display: flex; flex-direction: column; gap: .3rem; }
        .legal-inner a { color: var(--c1); text-decoration: none; }
        .legal-inner a:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
