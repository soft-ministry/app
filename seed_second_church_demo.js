#!/usr/bin/env node

const baseUrl = 'http://127.0.0.1:8081/api';
const churchName = 'Biserica Speranța Nouă';

const people = [
  ['Andrei', 'Dumitru', 'PASTOR', 'PASTOR', 'Pastor principal'],
  ['Elena', 'Radu', 'LEADER', 'LEADER', 'Coordonator administrativ'],
  ['Mihai', 'Radu', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Ioana', 'Mureșan', 'LEADER', 'LEADER', 'Coordonator copii'],
  ['Sergiu', 'Mureșan', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Cristina', 'Vlad', 'LEADER', 'LEADER', 'Coordonator închinare'],
  ['Paul', 'Vlad', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Roxana', 'Ilie', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Cătălin', 'Ilie', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Diana', 'Nistor', 'ADHERENT', 'MEMBER', 'Participant în formare'],
  ['Vlad', 'Nistor', 'ADHERENT', 'MEMBER', 'Participant în formare'],
  ['Maria', 'Lupu', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Iulian', 'Lupu', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Ana', 'Pavel', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Robert', 'Pavel', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Nadia', 'Toma', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Florin', 'Toma', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Sara', 'Cernat', 'CHILD', 'MEMBER', 'Participant Școala duminicală'],
  ['Matei', 'Cernat', 'CHILD', 'MEMBER', 'Participant Școala duminicală'],
  ['Gabriela', 'Stan', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Lucian', 'Stan', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Oana', 'Păun', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Victor', 'Păun', 'MEMBER', 'MEMBER', 'Membru activ'],
  ['Teodora', 'Badea', 'MEMBER', 'MEMBER', 'Membru activ'],
];

const dates = [
  '1972-02-14', '1980-06-21', '1978-11-03', '1985-04-17', '1983-09-12',
  '1981-01-28', '1979-08-09', '1990-03-22', '1988-07-16', '1996-10-05',
  '1994-12-19', '1975-05-30', '1974-10-11', '1987-02-08', '1986-06-26',
  '1992-09-15', '1991-01-07', '2015-04-04', '2017-08-20', '1989-11-18',
  '1987-03-13', '1984-05-24', '1982-09-02', '1993-07-27',
];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  }
  return body;
}

async function main() {
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const auth = { Authorization: `Bearer ${login.accessToken}` };
  const settings = await request('/settings/church', { headers: auth });
  let church = settings.churches.find(item => item.name === churchName);

  if (!church) {
    const created = await request('/settings/church/churches', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: churchName,
        pastorName: 'Andrei Dumitru',
        denomination: 'Creștină după Evanghelie',
        address: 'Str. Păcii 42, Brașov',
        treasurerName: 'Elena Radu',
        secretaryName: 'Mihai Radu',
        contactPerson: 'Ioana Mureșan',
        attendanceEnabled: true,
      }),
    });
    church = { id: created.id, name: created.name };
  } else {
    await request(`/settings/church/churches/${church.id}/select`, {
      method: 'POST', headers: auth, body: '{}',
    });
  }

  const existingPeople = await request('/persons', { headers: auth });
  const personIds = existingPeople.length === 0 ? [] : existingPeople.map(person => person.id);
  if (personIds.length === 0) {
    for (let index = 0; index < people.length; index += 1) {
      const [firstName, lastName, memberType, churchRole, position] = people[index];
      const created = await request('/persons', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          firstName,
          lastName,
          email: `${firstName.toLowerCase().replaceAll('ă', 'a').replaceAll('ș', 's')}.${lastName.toLowerCase().replaceAll('ă', 'a').replaceAll('ș', 's')}${index + 1}@demo-speranta.ro`,
          phone: `+40 722 8${String(index + 1).padStart(3, '0')} ${String(1800 + index * 37).padStart(4, '0')}`,
          address: `${12 + index} Str. Păcii, Brașov`,
          churchRole,
          position,
          description: 'Date fictive pentru demonstrație.',
          birthDate: dates[index],
          memberType,
          active: true,
          status: 'ACTIVE',
        }),
      });
      personIds.push(created.id);
    }
  }

  const existingGroups = await request('/groups', { headers: auth });
  let groupIds = existingGroups.map(group => group.id);
  if (groupIds.length === 0) {
    const groupDefinitions = [
      ['Echipa de închinare', 'MINISTRY', 'Cântare, instrumente și coordonarea programelor de închinare.', 5, [0, 4, 5, 6, 9, 10]],
      ['Tineret Rădăcini', 'SMALL_GROUP', 'Părtășie, ucenicie și întâlniri pentru adolescenți și tineri.', 1, [7, 8, 9, 10, 11, 12, 13, 14]],
      ['Diaconie și rugăciune', 'MINISTRY', 'Vizite, mijlocire și sprijin pentru familiile din comunitate.', 3, [1, 2, 3, 4, 15, 16, 19, 20]],
    ];
    for (const [name, type, description, leaderIndex, members] of groupDefinitions) {
      const created = await request('/groups', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          name,
          type,
          description,
          leaderId: personIds[leaderIndex],
          memberIds: members.map(index => personIds[index]),
        }),
      });
      groupIds.push(created.id);
    }
  }

  const existingEvents = await request('/events', { headers: auth });
  if (existingEvents.length === 0) {
    const events = [
      ['Serviciu divin de duminică · 01.11.2026', 'Închinare, predică biblică și părtășie pentru întreaga biserică.', '2026-11-01', '10:00', 'ACT_DE_CULT', 'HIGH', 0, 0],
      ['Seară de rugăciune pentru comunitate', 'Mijlocire pentru familii, școli și nevoile orașului.', '2026-11-04', '19:00', 'ACT_DE_CULT', 'MEDIUM', 2, 2],
      ['Întâlnire Tineret Rădăcini', 'Devoțional și discuție despre credința trăită în relații și la școală.', '2026-11-06', '19:00', 'FELLOWSHIP', 'MEDIUM', 1, 0],
      ['Cina Domnului', 'Serviciu special de comemorare, mulțumire și cercetare spirituală.', '2026-11-08', '10:00', 'ACT_DE_CULT', 'HIGH', 0, 0],
      ['Atelier pentru părinți și copii', 'Sesiune practică despre comunicare, rugăciune și educație biblică.', '2026-11-14', '10:00', 'STUDY', 'MEDIUM', 1, 3],
      ['Acțiune de ajutorare în cartier', 'Pregătirea și distribuirea pachetelor pentru familii aflate în nevoie.', '2026-11-21', '09:00', 'EVANGELISM', 'HIGH_MEDIUM', 2, 1],
      ['Program de Crăciun pentru comunitate', 'Colinde, mesaj biblic și timp de părtășie pentru invitați.', '2026-12-20', '17:00', 'EVENT', 'HIGH', 0, 0],
      ['Serviciu de mulțumire la cumpăna dintre ani', 'Mulțumire pentru anul încheiat și rugăciune pentru anul nou.', '2026-12-31', '19:00', 'ACT_DE_CULT', 'HIGH', 0, 0],
      ['Curs pentru lideri de grup', 'Ucenicie, responsabilitate și îngrijire pastorală în grupurile mici.', '2027-01-16', '10:00', 'STUDY', 'MEDIUM', 2, 0],
      ['Târg caritabil pentru proiectul social', 'Strângere de fonduri pentru ajutorarea familiilor vulnerabile.', '2027-02-27', '10:00', 'EVENT', 'MEDIUM', 2, 1],
    ];
    for (const [eventName, about, openDate, eventTime, eventType, priority, groupIndex, leaderIndex] of events) {
      await request('/events', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          eventName,
          about,
          openDate,
          endDate: openDate,
          eventTime,
          status: 'PLANNED',
          eventType,
          priority,
          recurrenceType: 'NONE',
          groupId: groupIds[groupIndex],
          implementedById: personIds[leaderIndex],
          responsibleIds: [personIds[leaderIndex]],
        }),
      });
    }
  }

  const existingTransactions = await request('/finance/transactions', { headers: auth });
  if (existingTransactions.length === 0) {
    const transactions = [
      ['Donații și zeciuieli - octombrie', 'INCOME', 3680, 'Donații și zeciuieli pentru luna octombrie.', '2026-10-25'],
      ['Donație fond social', 'INCOME', 1250, 'Donație dedicată ajutorării familiilor vulnerabile.', '2026-10-18'],
      ['Donație pentru misiune', 'INCOME', 900, 'Fond pentru susținerea unui proiect misionar.', '2026-11-01'],
      ['Chirie sală comunitară', 'EXPENSE', 950, 'Chiria spațiului pentru întâlniri și activități.', '2026-10-03'],
      ['Utilități și internet', 'EXPENSE', 515, 'Facturi lunare și conexiune pentru transmisii online.', '2026-10-12'],
      ['Pachete alimentare', 'EXPENSE', 780, 'Ajutor pentru 12 familii din comunitate.', '2026-10-21'],
      ['Materiale copii și tineret', 'EXPENSE', 340, 'Materiale pentru activitățile biblice și educative.', '2026-11-07'],
      ['Reparație pian și microfoane', 'EXPENSE', 620, 'Revizie și consumabile pentru echipa de închinare.', '2026-11-10'],
    ];
    for (const [name, type, amount, description, transactionDate] of transactions) {
      await request('/finance/transactions', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ type, name, amount, description, amountPrivate: false, transactionDate }),
      });
    }
  }

  const finalSettings = await request('/settings/church', { headers: auth });
  const finalPeople = await request('/persons', { headers: auth });
  const finalGroups = await request('/groups', { headers: auth });
  const finalEvents = await request('/events', { headers: auth });
  const finalTransactions = await request('/finance/transactions', { headers: auth });
  console.log(JSON.stringify({
    activeChurch: finalSettings.name,
    activeChurchId: finalSettings.id,
    churches: finalSettings.churches.length,
    people: finalPeople.length,
    groups: finalGroups.length,
    events: finalEvents.length,
    transactions: finalTransactions.length,
  }));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
