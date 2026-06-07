import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

/**
 * Fakturagrunnlag: tittel, alle utfyllingsfelt (uten boilerplate-tekst), Sted/dato + Signatur.
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingHorizontal: 56,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#000',
  },
  titleWrap: {
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  fieldLabel: {
    width: '42%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingRight: 8,
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.45,
  },
  formBlock: {
    marginTop: 22,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    width: '100%',
  },
  labelLeft: {
    fontSize: 10,
    width: '48%',
  },
  labelRight: {
    fontSize: 10,
    width: '48%',
    textAlign: 'right',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  valueCell: {
    width: '48%',
    borderBottomWidth: 0.75,
    borderBottomColor: '#000',
    paddingBottom: 8,
    minHeight: 24,
  },
  valueLeft: {
    fontSize: 10,
  },
  valueRight: {
    fontSize: 10,
    textAlign: 'right',
  },
})

export type InvoiceBasisPdfPayload = {
  listingAddressLine: string
  ownerName: string
  agreementPeriodLabel: string
  amountFormatted: string
  accountNumber: string
  stedDatoLine: string
  signaturLine: string
}

export function InvoiceBasisDocument({ data }: { data: InvoiceBasisPdfPayload }) {
  const sted = (data.stedDatoLine || '').trim()
  const sign = (data.signaturLine || '').trim()
  const stedDisplay = sted || '\u00a0'
  const signaturDisplay = sign || '\u00a0'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Fakturagrunnlag</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Adresse</Text>
          <Text style={styles.fieldValue}>{data.listingAddressLine || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Utleier</Text>
          <Text style={styles.fieldValue}>{data.ownerName || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Avtaleperiode (formidling)</Text>
          <Text style={styles.fieldValue}>{data.agreementPeriodLabel || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Avtalt husleie for perioden</Text>
          <Text style={styles.fieldValue}>{data.amountFormatted || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Kontonummer</Text>
          <Text style={styles.fieldValue}>{data.accountNumber || '—'}</Text>
        </View>

        <View style={styles.formBlock}>
          <View style={styles.labelRow}>
            <Text style={styles.labelLeft}>Sted/dato</Text>
            <Text style={styles.labelRight}>Signatur</Text>
          </View>
          <View style={styles.valueRow}>
            <View style={styles.valueCell}>
              <Text style={styles.valueLeft}>{stedDisplay}</Text>
            </View>
            <View style={styles.valueCell}>
              <Text style={styles.valueRight}>{signaturDisplay}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
