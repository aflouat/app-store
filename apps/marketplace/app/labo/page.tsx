import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from './page.module.css'

const ARTICLES = [
  {
    id: 1,
    title: "L'entreprise apprenante — pourquoi les meilleurs freelances fuient les plateformes classiques",
    date: '2026-03-15',
    category: 'Organisation',
    readingTime: '7 min',
    excerpt:
      "Les plateformes généralistes ont standardisé le marché freelance au détriment de la qualité. Les consultants ERP senior ne veulent pas enchérir contre des juniors offshore — ils veulent être reconnus pour leur expertise et trouvés par des entreprises qui comprennent leur valeur.",
  },
  {
    id: 2,
    title: "Time-to-Contract : la métrique que personne ne mesure",
    date: '2026-03-28',
    category: 'Performance',
    readingTime: '5 min',
    excerpt:
      "Le délai entre le premier contact et la signature du contrat est l'indicateur le plus révélateur de la maturité d'un processus de sourcing. Pourtant, aucune plateforme ne le publie. Nous l'avons mesuré, et les résultats changent tout.",
  },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function LaboPage() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        {/* HEADER */}
        <div className={styles.pageHeader}>
          <span className={styles.eyebrow}>Recherche & Réflexion</span>
          <h1 className={styles.pageTitle}>
            Le Laboratoire de la<br />Performance et de l&apos;Apprentissage
          </h1>
          <p className={styles.pageDesc}>
            Des analyses indépendantes sur les transformations organisationnelles, le consulting ERP, et les nouvelles formes de travail.
          </p>
        </div>

        {/* ARTICLES */}
        <div className={styles.articles}>
          {ARTICLES.map(article => (
            <article key={article.id} className={styles.article}>
              <div className={styles.articleMeta}>
                <span className={styles.articleCategory}>{article.category}</span>
                <span className={styles.articleDot}>·</span>
                <time className={styles.articleDate}>{formatDate(article.date)}</time>
                <span className={styles.articleDot}>·</span>
                <span className={styles.articleRead}>{article.readingTime} de lecture</span>
              </div>
              <h2 className={styles.articleTitle}>{article.title}</h2>
              <p className={styles.articleExcerpt}>{article.excerpt}</p>
              <span className={styles.articleCta}>Lire l&apos;article (bientôt disponible) →</span>
            </article>
          ))}
        </div>

        {/* BACK */}
        <Link href="/" className={styles.back}>← Retour au catalogue</Link>
      </main>
      <Footer />
    </div>
  )
}
