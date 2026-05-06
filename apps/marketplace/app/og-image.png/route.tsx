import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/png'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#f7f5f3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: '80px',
            fontWeight: 900,
            color: '#1a1a1a',
            marginBottom: '16px',
            letterSpacing: '-2px',
          }}
        >
          perform-learn.fr
        </div>
        <div
          style={{
            fontSize: '30px',
            color: '#B9958D',
            textAlign: 'center',
            marginBottom: '48px',
            maxWidth: '900px',
          }}
        >
          Consultants experts B2B · KYC vérifié · Matching algorithmique · Paiement séquestre
        </div>
        <div
          style={{
            display: 'flex',
            gap: '24px',
          }}
        >
          <div
            style={{
              background: '#B9958D',
              color: 'white',
              padding: '18px 36px',
              borderRadius: '10px',
              fontSize: '26px',
              fontWeight: 600,
            }}
          >
            20 places Fondateur — 10% commission
          </div>
          <div
            style={{
              background: '#1a1a1a',
              color: 'white',
              padding: '18px 36px',
              borderRadius: '10px',
              fontSize: '26px',
              fontWeight: 600,
            }}
          >
            ERP · SAP · D365 · Supply Chain
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
