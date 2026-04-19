import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { EvidenceBundle, EvidenceArtifact } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0a0a0a",
  },
  brand: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#1f7a1f",
    marginBottom: 4,
  },
  h1: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  meta: {
    fontSize: 9,
    color: "#5b5b5b",
    marginBottom: 18,
  },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    border: "1pt solid #d4d4d4",
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  heroCol: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 7,
    color: "#5b5b5b",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  heroVal: {
    fontSize: 13,
    fontWeight: "bold",
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "#5b5b5b",
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 4,
  },
  summary: {
    fontSize: 11,
    lineHeight: 1.45,
    marginBottom: 4,
    color: "#1a1a1a",
  },
  artifact: {
    border: "1pt solid #d4d4d4",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  artifactKind: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#1f7a1f",
    marginBottom: 3,
  },
  artifactTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 3,
  },
  artifactTimestamp: {
    fontSize: 8,
    color: "#5b5b5b",
    marginBottom: 6,
  },
  artifactSource: {
    fontSize: 8,
    color: "#5b5b5b",
    marginBottom: 6,
    fontFamily: "Courier",
  },
  artifactText: {
    fontSize: 9,
    color: "#1a1a1a",
    lineHeight: 1.4,
    marginTop: 4,
  },
  annotation: {
    marginTop: 6,
    padding: 6,
    backgroundColor: "#f4f9f4",
    borderLeft: "2pt solid #1f7a1f",
    fontSize: 9,
    fontStyle: "italic",
    color: "#1a1a1a",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#8a8a8a",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1pt solid #e5e5e5",
    paddingTop: 8,
  },
});

const KIND_LABEL: Record<EvidenceArtifact["kind"], string> = {
  screenshot: "Portal screenshot",
  dom_element: "DOM capture",
  video_clip: "Video clip",
  receipt_text: "POS receipt",
  claude_annotation: "Agent annotation",
};

function ArtifactView({ a }: { a: EvidenceArtifact }) {
  return (
    <View style={styles.artifact} wrap={false}>
      <Text style={styles.artifactKind}>{KIND_LABEL[a.kind]}</Text>
      <Text style={styles.artifactTitle}>{a.title}</Text>
      <Text style={styles.artifactTimestamp}>
        Captured {new Date(a.capturedAt).toLocaleString("en-US")}
      </Text>
      {a.source && <Text style={styles.artifactSource}>{a.source}</Text>}
      {a.text && <Text style={styles.artifactText}>{a.text}</Text>}
      {a.claudeAnnotation && (
        <Text style={styles.annotation}>{a.claudeAnnotation}</Text>
      )}
    </View>
  );
}

export function EvidencePdf({ bundle }: { bundle: EvidenceBundle }) {
  const recoverable = `$${(bundle.totalRecoverableCents / 100).toFixed(2)}`;
  return (
    <Document
      title={`Counter Evidence — ${bundle.caseNumber}`}
      author="Counter"
      subject="Dispute evidence packet"
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.brand}>COUNTER · EVIDENCE PACKET</Text>
        <Text style={styles.h1}>Case {bundle.caseNumber}</Text>
        <Text style={styles.meta}>
          Generated {new Date(bundle.generatedAt).toLocaleString("en-US")} ·{" "}
          {bundle.merchantName}
        </Text>

        <View style={styles.hero}>
          <View style={styles.heroCol}>
            <Text style={styles.heroLabel}>Recoverable</Text>
            <Text style={styles.heroVal}>{recoverable}</Text>
          </View>
          <View style={styles.heroCol}>
            <Text style={styles.heroLabel}>Candidate ID</Text>
            <Text style={styles.heroVal}>{bundle.candidateId}</Text>
          </View>
          <View style={styles.heroCol}>
            <Text style={styles.heroLabel}>Artifacts</Text>
            <Text style={styles.heroVal}>{bundle.artifacts.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Summary</Text>
        <Text style={styles.summary}>{bundle.summary}</Text>

        <Text style={styles.sectionLabel}>Artifacts</Text>
        {bundle.artifacts.map((a, i) => (
          <ArtifactView key={i} a={a} />
        ))}

        <View style={styles.footer} fixed>
          <Text>Counter · API-proof recovery</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
