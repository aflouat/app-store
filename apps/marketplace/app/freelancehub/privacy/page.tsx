export const metadata = { title: 'Politique de confidentialité — FreelanceHub' }

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <h1 className="legal-title">Politique de confidentialité</h1>
        <p className="legal-version">Version 1.0 — avril 2026 · Conforme RGPD (UE) 2016/679</p>

        <section>
          <h2>1. Responsable du traitement</h2>
          <p>
            <strong>EMMAEINNA Aminetou</strong> — SIRET : 103 082 673<br />
            Adresse : 78330 Fontenay le fleury <br />
            France <br />
            Email : <a href="mailto:contact@perform-learn.fr">contact@perform-learn.fr</a>
          </p>
        </section>

        <section>
          <h2>2. Données collectées</h2>
          <table className="legal-table">
            <thead>
              <tr><th>Catégorie</th><th>Données</th></tr>
            </thead>
            <tbody>
              <tr><td>Identification</td><td>Nom, email, mot de passe (haché bcrypt)</td></tr>
              <tr><td>Profil consultant</td><td>Titre, biographie, tarif horaire, expérience, localisation, LinkedIn, compétences, vidéo CV</td></tr>
              <tr><td>Documents KYC</td><td>Kbis ou attestation URSSAF (stockés chiffrés dans MinIO / OVH)</td></tr>
              <tr><td>Transactions</td><td>Réservations, paiements, montants, évaluations</td></tr>
              <tr><td>Technique</td><td>Adresse IP, User-Agent (pour preuve d'acceptation CGU)</td></tr>
              <tr><td>Marketing</td><td>Consentement email (opt-in explicite uniquement)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>3. Finalités et bases légales</h2>
          <table className="legal-table">
            <thead>
              <tr><th>Finalité</th><th>Base légale (RGPD)</th></tr>
            </thead>
            <tbody>
              <tr><td>Exécution du contrat de réservation</td><td>Art. 6.1.b — nécessité contractuelle</td></tr>
              <tr><td>Vérification KYC des consultants</td><td>Art. 6.1.b — nécessité contractuelle</td></tr>
              <tr><td>Preuve d'acceptation des CGU</td><td>Art. 6.1.c — obligation légale + Art. 7 (preuve consentement)</td></tr>
              <tr><td>Emails transactionnels (confirmation, rappel)</td><td>Art. 6.1.b — nécessité contractuelle</td></tr>
              <tr><td>Emails marketing / newsletters</td><td>Art. 6.1.a — consentement explicite (opt-in)</td></tr>
              <tr><td>Analytics anonymisés (Umami)</td><td>Art. 6.1.f — intérêt légitime (aucun cookie tiers)</td></tr>
              <tr><td>Conservation comptable des paiements</td><td>Art. 6.1.c — obligation légale (10 ans)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>4. Durée de conservation</h2>
          <ul>
            <li><strong>Profil actif :</strong> durée du compte + 3 ans après dernière connexion</li>
            <li><strong>Données de paiement et réservations :</strong> 10 ans (obligation comptable légale)</li>
            <li><strong>Documents KYC :</strong> durée du compte + 5 ans</li>
            <li><strong>Logs techniques (IP, UA) :</strong> 12 mois</li>
            <li><strong>À la suppression du compte :</strong> anonymisation des données personnelles identifiantes (nom → "Utilisateur supprimé", email haché)</li>
          </ul>
        </section>

        <section>
          <h2>5. Sous-traitants (transferts de données)</h2>
          <table className="legal-table">
            <thead>
              <tr><th>Sous-traitant</th><th>Usage</th><th>Localisation</th></tr>
            </thead>
            <tbody>
              <tr><td>OVH SAS (VPS)</td><td>Hébergement base de données, fichiers KYC</td><td>France — UE</td></tr>
              <tr><td>Vercel Inc.</td><td>Hébergement front-end Next.js</td><td>USA — SCCs applicables</td></tr>
              <tr><td>Stripe Inc.</td><td>Paiement par séquestre</td><td>USA — SCCs applicables</td></tr>
              <tr><td>Resend Inc.</td><td>Emails transactionnels</td><td>USA — SCCs applicables</td></tr>
            </tbody>
          </table>
          <p>
            Pour les sous-traitants hors UE, des clauses contractuelles types (SCCs) approuvées par la
            Commission européenne sont en place, conformément à l'article 46 RGPD.
          </p>
        </section>

        <section>
          <h2>6. Vos droits</h2>
          <p>
            Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :
          </p>
          <ul>
            <li><strong>Accès :</strong> obtenir une copie de vos données personnelles</li>
            <li><strong>Rectification :</strong> corriger des informations inexactes</li>
            <li><strong>Effacement :</strong> supprimer votre compte et anonymiser vos données (hors obligations légales)</li>
            <li><strong>Portabilité :</strong> recevoir vos données dans un format structuré (JSON/CSV)</li>
            <li><strong>Opposition :</strong> vous opposer aux traitements basés sur l'intérêt légitime</li>
            <li><strong>Retrait du consentement :</strong> désactiver les emails marketing à tout moment</li>
          </ul>
          <p>
            Pour exercer ces droits :{' '}
            <a href="mailto:contact@perform-learn.fr">contact@perform-learn.fr</a>.
            Délai de réponse : 30 jours.
          </p>
          <p>
            Vous pouvez également déposer une réclamation auprès de la{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">CNIL</a>.
          </p>
        </section>

        <section>
          <h2>7. Sécurité</h2>
          <p>
            Les données sont hébergées sur des serveurs OVH en France, protégées par chiffrement HTTPS
            (TLS 1.3), mots de passe hachés (bcrypt 12 rounds), accès SSH restreint et Docker isolé.
            Les documents KYC sont stockés dans un bucket MinIO privé non accessible publiquement.
          </p>
        </section>

        <section>
          <h2>8. Cookies</h2>
          <p>
            FreelanceHub utilise uniquement des cookies de session nécessaires à l'authentification
            (NextAuth.js). L'analytics est assuré par Umami en mode sans cookie tiers — aucune donnée
            personnelle n'est transmise à des tiers à des fins publicitaires.
          </p>
        </section>

        <section>
          <h2>9. Modifications</h2>
          <p>
            Toute modification substantielle de cette politique vous sera notifiée par email avec un délai
            de préavis de 30 jours. La date de mise à jour est indiquée en en-tête.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            Responsable traitement RGPD :{' '}
            <a href="mailto:contact@perform-learn.fr">contact@perform-learn.fr</a>
          </p>
        </section>
      </div>

      <style>{`
        .legal-page { min-height: 100vh; background: var(--bg); padding: 3rem 1rem; }
        .legal-inner { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.8rem; }
        .legal-title { font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 700; color: var(--dark); }
        .legal-version { color: var(--text-light); font-size: .85rem; margin-top: -.8rem; }
        .legal-inner section { display: flex; flex-direction: column; gap: .75rem; }
        .legal-inner h2 { font-size: 1.05rem; font-weight: 700; color: var(--dark); border-bottom: 1px solid var(--border); padding-bottom: .4rem; }
        .legal-inner p, .legal-inner li { font-size: .93rem; color: var(--text); line-height: 1.7; }
        .legal-inner ul { padding-left: 1.4rem; display: flex; flex-direction: column; gap: .3rem; }
        .legal-inner a { color: var(--c1); text-decoration: none; }
        .legal-inner a:hover { text-decoration: underline; }
        .legal-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
        .legal-table th { text-align: left; padding: .5rem .75rem; background: var(--bg); font-weight: 600; color: var(--text); border: 1px solid var(--border); }
        .legal-table td { padding: .5rem .75rem; border: 1px solid var(--border); color: var(--text); vertical-align: top; }
      `}</style>
    </div>
  )
}
