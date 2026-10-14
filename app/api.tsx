import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { fetchApiCatalog, sendApiOperation, type ApiCallResult, type ApiOperation } from '@/src/auth/api';
import { asCampusStudies, asCurriculumNodes, type CampusLogin } from '@/src/auth/campus';
import { Button, Card, InfoRow, Muted, Screen, Section } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

function summary(locale: 'de' | 'en', id: string): string {
  const copy: Record<string, [string, string]> = {
    health: ['Serverstatus, ohne Token.', 'Server status, without the token.'],
    'campus-config': ['Ob Token und Sitzungs-Cookie gesetzt sind.', 'Whether the token and session cookie are set.'],
    'oidc-config': ['Ob der Identity Provider vorbereitet ist.', 'Whether the identity provider is prepared.'],
    'campus-login': ['Lädt die Curriculum-Wurzel und meldet damit an.', 'Loads the curriculum root and signs in with it.'],
    'campus-structure': ['Dieselbe Struktur, optional für eine Kind-Id.', 'The same structure, optionally for a child id.'],
    'campus-studies': ['Listet die eingeschriebenen Studiengänge.', 'Lists the enrolled degree programs.'],
    assist: ['Kurze Testfrage an das Modell.', 'A short test question to the model.'],
    'oidc-start': ['Startet den Browser-Login. Nicht von hier.', 'Starts the browser login. Not from here.'],
    'oidc-exchange': ['Tauscht den Code. Nicht von hier.', 'Exchanges the code. Not from here.'],
    'oidc-logout': ['Beendet die IdP-Sitzung. Nicht von hier.', 'Ends the IdP session. Not from here.'],
  };
  const pair = copy[id];
  return pair ? tx(locale, pair[0], pair[1]) : id;
}

function preview(value: unknown): string {
  const text = JSON.stringify(value, null, 2) ?? '';
  return text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
}

export default function ApiScreen() {
  const { locale, curriculumNodes, campusStudies, setCurriculum, setStudies, signInCampus } = useApp();
  const [operations, setOperations] = useState<ApiOperation[]>([]);
  const [live, setLive] = useState(true);
  const [elementId, setElementId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [result, setResult] = useState<ApiCallResult | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetchApiCatalog().then((catalog) => {
      if (!active) return;
      setOperations(catalog.operations);
      setLive(catalog.live);
    });
    return () => {
      active = false;
    };
  }, []);

  async function send(operation: ApiOperation, requestedId?: number) {
    if (busyId) return;
    const typed = requestedId ?? (elementId ? Number(elementId) : undefined);
    if (operation.acceptsElementId && elementId && !requestedId && !/^[1-9]\d{0,9}$/.test(elementId)) {
      setNotice(tx(locale, 'Die Element-Id muss eine positive Ganzzahl sein.', 'The element id must be a positive integer.'));
      return;
    }
    setNotice('');
    setBusyId(operation.id);
    try {
      const next = await sendApiOperation(operation, typed, locale);
      setResult(next);
      const error = next.body && typeof next.body === 'object' && 'error' in next.body && typeof next.body.error === 'string' ? next.body.error : '';
      if (error === 'invalid_token') {
        setNotice(
          tx(
            locale,
            'C@MPUS meldet invalid_token. Der gespeicherte Bearer-Token passt nicht mehr zu dieser Sitzung.',
            'C@MPUS reports invalid_token. The stored bearer token no longer matches this session.',
          ),
        );
        return;
      }
      if (operation.id === 'campus-login' && next.status === 200) {
        const body = next.body as Partial<CampusLogin>;
        const nodes = asCurriculumNodes(body.nodes);
        if (body.account && body.name) signInCampus({ account: body.account, name: body.name, nodes });
        setNotice(
          tx(
            locale,
            body.name ? `${body.name}: ${nodes.length} Knoten.` : 'Anmeldung ohne Namen.',
            body.name ? `${body.name}: ${nodes.length} nodes.` : 'Sign-in without a name.',
          ),
        );
      }
      if (operation.id === 'campus-structure' && next.status === 200) {
        const nodes = asCurriculumNodes((next.body as { nodes?: unknown }).nodes);
        if (nodes.length) setCurriculum(nodes);
        setNotice(tx(locale, `${nodes.length} Knoten übernommen.`, `Stored ${nodes.length} nodes.`));
      }
      if (operation.id === 'campus-studies' && next.status === 200) {
        const studies = asCampusStudies((next.body as { studies?: unknown }).studies);
        if (studies.length) setStudies(studies);
        setNotice(tx(locale, `${studies.length} Studiengänge übernommen.`, `Stored ${studies.length} degree programs.`));
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setResult(null);
      setNotice(
        code === 'server_unreachable'
          ? tx(locale, 'Der Server auf Port 8787 antwortet nicht. Starte npm run assistant neu.', 'The server on port 8787 is not answering. Restart npm run assistant.')
          : code,
      );
    } finally {
      setBusyId('');
    }
  }

  return (
    <Screen
      back
      kicker="API"
      title={tx(locale, 'Schnittstelle', 'Interface')}
      subtitle={tx(
        locale,
        'Token und Cookie bleiben auf dem Server. Senden geht nur für die Aufrufe, die diese App schon kennt.',
        'The token and cookie stay on the server. Send works only for the calls this app already knows.',
      )}
    >
      {live ? null : (
        <Muted>
          {tx(
            locale,
            'Die Liste ist die bekannte Fassung. GET /v1/api antwortet noch nicht. Starte den Server neu.',
            'This list is the known set. GET /v1/api is not answering yet. Restart the server.',
          )}
        </Muted>
      )}
      <Section title={tx(locale, 'Aufrufe', 'Calls')} />
      {operations.map((operation) => (
        <Card key={operation.id}>
          <Text style={styles.method}>
            {operation.method} {operation.path}
          </Text>
          <Muted>{summary(locale, operation.id)}</Muted>
          {operation.acceptsElementId ? (
            <TextInput
              value={elementId}
              onChangeText={setElementId}
              keyboardType="number-pad"
              placeholder={tx(locale, 'Element-Id, leer = Wurzel', 'Element id, empty = root')}
              placeholderTextColor={colors.mute}
              style={styles.input}
            />
          ) : null}
          {operation.replay ? (
            <Button
              label={busyId === operation.id ? tx(locale, 'Sende …', 'Sending …') : tx(locale, 'Senden', 'Send')}
              onPress={() => send(operation)}
            />
          ) : (
            <Muted>{tx(locale, 'Nur im Anmeldeablauf.', 'Only in the sign-in flow.')}</Muted>
          )}
        </Card>
      ))}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {result ? (
        <Card>
          <Text style={styles.method}>
            {result.status} · {result.elapsedMs} ms
          </Text>
          <Text style={styles.preview}>{preview(result.body)}</Text>
        </Card>
      ) : null}
      <Section title={tx(locale, 'Studiengänge', 'Degree programs')} />
      {campusStudies.length === 0 ? (
        <Muted>{tx(locale, 'Noch keine Studiengänge. Sende die Chooser-Abfrage.', 'No degree programs yet. Send the chooser call.')}</Muted>
      ) : (
        campusStudies.map((study) => (
          <InfoRow
            key={study.studyId}
            title={study.name}
            meta={study.intendedDegree || String(study.studyId)}
            detail={[
              study.studyStatus,
              study.versionIdentifier,
              study.lastAccessed ? tx(locale, 'zuletzt geöffnet', 'last opened') : '',
              study.elementId ? `element ${study.elementId}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        ))
      )}
      <Section title={tx(locale, 'Curriculum', 'Curriculum')} />
      {curriculumNodes.length === 0 ? (
        <Muted>{tx(locale, 'Noch keine Knoten. Sende die Curriculum-Struktur.', 'No nodes yet. Send the curriculum structure.')}</Muted>
      ) : (
        curriculumNodes.map((node) => (
          <InfoRow
            key={node.id}
            title={node.name}
            meta={node.designation || String(node.id)}
            detail={[
              node.elementType,
              node.parentId ? `parent ${node.parentId}` : tx(locale, 'Wurzel', 'Root'),
              node.completed ? tx(locale, 'abgeschlossen', 'completed') : '',
              node.inProgress ? tx(locale, 'in Arbeit', 'in progress') : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => {
              const operation = operations.find((item) => item.id === 'campus-structure');
              if (operation) send(operation, node.id);
            }}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  method: { color: colors.anthracite, fontSize: 15, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.anthracite,
    fontSize: 16,
  },
  notice: { color: colors.blue, fontSize: 15, lineHeight: 21 },
  preview: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' },
});
