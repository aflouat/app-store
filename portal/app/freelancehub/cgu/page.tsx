export const metadata = { title: 'Conditions Générales d\'Utilisation — FreelanceHub' }

export default function CguPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <h1 className="legal-title">Conditions Générales d'Utilisation</h1>
        <p className="legal-version">Version 1.0 — avril 2026</p>

        <section>
          <h2>1. Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la
            plateforme FreelanceHub, accessible via <strong>portal.perform-learn.fr</strong>, éditée par
            [NOM_COMMERCIAL] (SIRET : [SIRET]).
          </p>
          <p>
            FreelanceHub est une place de marché B2B d'intermédiation entre des consultants experts
            (freelances) et des entreprises clientes, permettant la réservation de consultations horaires
            avec paiement par séquestre.
          </p>
        </section>

        <section>
          <h2>2. Acceptation des CGU</h2>
          <p>
            L'accès à la plateforme implique l'acceptation pleine et entière des présentes CGU. Toute
            inscription vaut acceptation explicite, horodatée et conservée conformément à l'article 7 du
            RGPD.
          </p>
        </section>

        <section>
          <h2>3. Description du service</h2>
          <p>FreelanceHub propose :</p>
          <ul>
            <li>Un algorithme de matching entre consultants et clients selon les compétences, le budget et la disponibilité</li>
            <li>Un système de réservation de créneaux horaires</li>
            <li>Un paiement sécurisé par séquestre (escrow) via Stripe</li>
            <li>Un dispositif d'anonymat du consultant jusqu'à la confirmation du paiement</li>
            <li>Un système d'évaluation mutuelle post-mission</li>
          </ul>
        </section>

        <section>
          <h2>4. Inscription et comptes</h2>
          <p>
            L'inscription est ouverte aux personnes majeures agissant à titre professionnel. L'utilisateur
            s'engage à fournir des informations exactes et à maintenir la confidentialité de ses
            identifiants. Tout compte créé avec des informations frauduleuses pourra être suspendu sans
            préavis.
          </p>
          <p>
            Deux types de comptes sont disponibles : <strong>Consultant Expert</strong> (prestataire de
            services) et <strong>Client Entreprise</strong> (donneur d'ordre).
          </p>
        </section>

        <section>
          <h2>5. KYC et vérification des consultants</h2>
          <p>
            Afin de garantir la qualité et la légitimité des consultants, un processus de vérification
            d'identité (KYC) est requis avant l'activation complète du profil. Ce processus implique la
            fourniture d'un extrait Kbis ou d'une attestation URSSAF en cours de validité. Le badge
            "Vérifié" est attribué après validation par l'équipe FreelanceHub.
          </p>
        </section>

        <section>
          <h2>6. NDA et confidentialité</h2>
          <p>
            Avant toute première mission, le consultant accepte un accord de non-divulgation (NDA) sous
            forme de signature horodatée. Cet accord interdit la divulgation d'informations confidentielles
            obtenues dans le cadre des missions réalisées via la plateforme.
          </p>
        </section>

        <section>
          <h2>7. Tarifs et commissions</h2>
          <ul>
            <li>
              La commission standard prélevée par FreelanceHub est de <strong>15 %</strong> du montant HT
              de chaque consultation.
            </li>
            <li>
              Les consultants <strong>Early Adopter</strong> (20 premiers inscrits et validés) bénéficient
              d'une commission réduite à <strong>10 %</strong> et du badge "Fondateur".
            </li>
            <li>Le prix de la consultation est fixé librement par le consultant (tarif horaire en €/h).</li>
            <li>La TVA applicable est de 20 % sur le montant HT.</li>
          </ul>
        </section>

        <section>
          <h2>8. Paiement par séquestre</h2>
          <p>
            Le paiement est effectué par le client via Stripe au moment de la réservation. Les fonds sont
            conservés en séquestre jusqu'à la réalisation de la mission et la soumission des évaluations
            par les deux parties. La libération des fonds est automatique après réception des deux
            évaluations. Les obligations comptables imposent la conservation des données de paiement
            pendant 10 ans.
          </p>
        </section>

        <section>
          <h2>9. Anonymat et révélation d'identité</h2>
          <p>
            Les informations personnelles du consultant (nom, email, LinkedIn, biographie) sont masquées
            dans les résultats de recherche et ne sont révélées au client qu'après confirmation du
            paiement. Cette mesure protège à la fois les données personnelles du consultant et garantit
            l'engagement du client.
          </p>
        </section>

        <section>
          <h2>10. Obligations des utilisateurs</h2>
          <p>Les utilisateurs s'engagent à :</p>
          <ul>
            <li>Ne pas utiliser la plateforme à des fins illicites ou frauduleuses</li>
            <li>Ne pas contacter directement l'autre partie en dehors de la plateforme pour contourner les commissions</li>
            <li>Respecter les engagements pris lors des réservations confirmées</li>
            <li>Soumettre une évaluation honnête après chaque mission complétée</li>
          </ul>
        </section>

        <section>
          <h2>11. Responsabilité</h2>
          <p>
            FreelanceHub agit en qualité d'intermédiaire et ne saurait être tenu responsable de la qualité
            des prestations fournies par les consultants, ni des préjudices résultant d'une mission. La
            responsabilité de FreelanceHub est limitée au montant des commissions perçues sur la
            transaction concernée.
          </p>
        </section>

        <section>
          <h2>12. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments de la plateforme (interface, algorithmes, marques, contenus) sont la
            propriété exclusive de [NOM_COMMERCIAL] et sont protégés par le droit de la propriété
            intellectuelle. Toute reproduction est interdite sans autorisation écrite préalable.
          </p>
        </section>

        <section>
          <h2>13. Données personnelles</h2>
          <p>
            Le traitement des données personnelles est régi par notre{' '}
            <a href="/freelancehub/privacy">Politique de confidentialité</a>, conforme au RGPD (UE) 2016/679.
          </p>
        </section>

        <section>
          <h2>14. Résiliation</h2>
          <p>
            L'utilisateur peut supprimer son compte à tout moment depuis les paramètres ou en contactant{' '}
            <a href="mailto:contact@perform-learn.fr">contact@perform-learn.fr</a>. Les données de
            paiement sont conservées 10 ans pour obligations comptables. Les données personnelles sont
            anonymisées à la suppression du compte.
          </p>
        </section>

        <section>
          <h2>15. Droit applicable et juridiction</h2>
          <p>
            Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'engagent à
            rechercher une solution amiable avant tout recours judiciaire. À défaut, les tribunaux compétents
            sont ceux du ressort du siège social de [NOM_COMMERCIAL].
          </p>
        </section>

        <section>
          <h2>16. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU :{' '}
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
      `}</style>
    </div>
  )
}
