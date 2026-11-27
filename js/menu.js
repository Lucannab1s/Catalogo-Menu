/* =====================================================================
   MENÙ CONDIVISO: modifica solo questo file.
   Tutti gli stili leggono da qui: nome, piatti, prezzi, foto, etichette.
   Le foto stanno in /assets (nome del file nel campo "foto").
   Etichette: v = vegetariano, gf = senza glutine.
   ===================================================================== */
window.MENU = {
  ristorante: 'Trattoria Sette Archi',
  luogo: 'Cucina di casa, Roma',
  stagione: 'Menù d’autunno',
  coperto: 2.5,
  nota: 'Il menù cambia con le stagioni. Per allergie e intolleranze chiedi al personale: ogni piatto ha la sua scheda degli allergeni.',
  categorie: [
    {
      id: 'antipasti', nome: 'Antipasti', breve: 'Per cominciare',
      piatti: [
        { id: 'pane', nome: 'Pane e pomodoro', desc: 'Pane casereccio tostato, pomodoro maturo strofinato, olio nuovo e sale grosso.', prezzo: 6, foto: 'pane-pomodoro.jpg', tag: ['v'] },
        { id: 'burrata', nome: 'Burrata di bufala', desc: 'Burrata pugliese intera, pomodorini confit, basilico e olio al limone.', prezzo: 12, foto: 'burrata.jpg', tag: ['v', 'gf'] },
        { id: 'carciofi', nome: 'Carciofi alla romana', desc: 'Carciofi mammole stufati con mentuccia, aglio e olio, serviti tiepidi.', prezzo: 9, foto: 'carciofi.jpg', tag: ['v', 'gf'] },
        { id: 'vitello', nome: 'Vitello tonnato', desc: 'Girello rosa a fette sottili, salsa tonnata, capperi e germogli.', prezzo: 12, foto: 'vitello-tonnato.jpg', tag: ['gf'] },
      ],
    },
    {
      id: 'primi', nome: 'Primi', breve: 'La pasta e il riso',
      piatti: [
        { id: 'cacio', nome: 'Cacio e pepe', desc: 'Spaghettoni, pecorino romano stagionato e pepe nero tostato al momento.', prezzo: 13, foto: 'cacio-e-pepe.jpg', tag: ['v'] },
        { id: 'carbonara', nome: 'Carbonara', desc: 'Spaghetti, guanciale croccante, tuorlo, pecorino e pepe. Niente panna.', prezzo: 14, foto: 'carbonara.jpg', tag: [] },
        { id: 'risotto', nome: 'Risotto allo zafferano', desc: 'Carnaroli mantecato al burro, pistilli di zafferano e midollo.', prezzo: 16, foto: 'risotto.jpg', tag: ['gf'] },
        { id: 'lasagna', nome: 'Lasagna della domenica', desc: 'Sfoglia all’uovo, ragù di manzo e maiale cotto sei ore, besciamella.', prezzo: 14, foto: 'lasagna.jpg', tag: [] },
      ],
    },
    {
      id: 'secondi', nome: 'Secondi', breve: 'Carne, pesce, orto',
      piatti: [
        { id: 'ossobuco', nome: 'Ossobuco e risotto giallo', desc: 'Stinco di vitello brasato, gremolada di limone e prezzemolo, risotto allo zafferano.', prezzo: 24, foto: 'ossobuco.jpg', tag: [] },
        { id: 'tagliata', nome: 'Tagliata di manzo', desc: 'Controfiletto alla brace, rucola, scaglie di grana e aceto balsamico.', prezzo: 24, foto: 'tagliata.jpg', tag: ['gf'] },
        { id: 'branzino', nome: 'Branzino al cartoccio', desc: 'Branzino intero al forno nella carta, limone, timo e patate novelle.', prezzo: 21, foto: 'branzino.jpg', tag: ['gf'] },
        { id: 'parmigiana', nome: 'Parmigiana di melanzane', desc: 'Melanzane fritte, sugo di pomodoro, fiordilatte e basilico, al forno.', prezzo: 15, foto: 'parmigiana.jpg', tag: ['v'] },
      ],
    },
    {
      id: 'dolci', nome: 'Dolci', breve: 'Per finire',
      piatti: [
        { id: 'tiramisu', nome: 'Tiramisù', desc: 'Savoiardi al caffè, crema al mascarpone, cacao amaro. Fatto ogni mattina.', prezzo: 7, foto: 'tiramisu.jpg', tag: ['v'] },
        { id: 'pannacotta', nome: 'Panna cotta', desc: 'Panna cotta alla vaniglia con salsa di frutti rossi.', prezzo: 6, foto: 'panna-cotta.jpg', tag: ['v', 'gf'] },
        { id: 'cannoli', nome: 'Cannoli siciliani', desc: 'Cialda croccante riempita al momento di ricotta, pistacchio e ciliegia candita.', prezzo: 7, foto: 'cannoli.jpg', tag: ['v'] },
        { id: 'affogato', nome: 'Affogato al caffè', desc: 'Gelato al fiordilatte affogato in un espresso caldo.', prezzo: 5, foto: 'affogato.jpg', tag: ['v', 'gf'] },
      ],
    },
  ],
};

/* Gli stili del catalogo, nell'ordine in cui compaiono. prezzo: costo dello stile in euro. */
window.STILI = [
  { id: 'lista', prezzo: 250, nome: 'Lista viva', tecnica: 'Foto fissa ed elenco attivo', adatto: 'Trattorie, osterie, cucina di casa', desc: 'La foto a sinistra resta ferma e cambia con il piatto che stai leggendo. Il più chiaro da usare: si legge come un menù di carta.' },
  { id: 'poster', prezzo: 270, nome: 'Poster fisso', tecnica: 'Titolo fisso con position: sticky', adatto: 'Bistrot, cucina contemporanea', desc: 'Il nome della portata resta fermo su un campo di colore mentre i piatti scorrono accanto, con le loro foto.' },
  { id: 'nastro', prezzo: 330, nome: 'Nastro', tecnica: 'Scroll orizzontale legato allo scroll', adatto: 'Pizzerie, street food, locali giovani', desc: 'Scendendo, i piatti passano di lato come su un nastro. Sul telefono si sfogliano col dito, una fila per portata.' },
  { id: 'degustazione', prezzo: 360, nome: 'Una portata alla volta', tecnica: 'Una cornice, il contenuto cambia', adatto: 'Alta cucina, menù degustazione', desc: 'Una sola cornice al centro: ogni passo dello scroll serve la portata successiva, come al tavolo.' },
  { id: 'tipo', prezzo: 290, nome: 'Solo tipografia', tecnica: 'Font variabile e foto al passaggio', adatto: 'Cocktail bar, enoteche, locali di design', desc: 'Solo lettere: la riga sotto il puntatore si gonfia di peso e larghezza e la foto del piatto la segue. Sul telefono la foto si accende dietro le lettere.' },
  { id: 'brace', prezzo: 400, nome: 'Fuoco vivo', tecnica: 'Shader WebGL e scintille sulla GPU', adatto: 'Bracerie, steakhouse, pizzerie a legna', desc: 'Dietro il menù arde una brace disegnata in tempo reale. Il puntatore, o il dito, soffia sul fuoco.' },
  { id: 'filtri', prezzo: 340, nome: 'Filtri animati', tecnica: 'View Transitions e ricerca dal vivo', adatto: 'Menù lunghi, asporto e consegna', desc: 'Portate, vegetariano, senza glutine, prezzo e ricerca: i piatti si spostano al loro posto con un’animazione del browser.' },
  { id: 'scontrino', prezzo: 310, nome: 'Lo scontrino', tecnica: 'Stampa riga per riga e conto dal vivo', adatto: 'Friggitorie, paninerie, bar, tavole calde', desc: 'Il menù esce come uno scontrino mentre scorri. Aggiungi i piatti e il totale si aggiorna.' },
  { id: 'giostra', prezzo: 380, nome: 'Giostra 3D', tecnica: 'Anello 3D in CSS, scroll e trascinamento', adatto: 'Gelaterie, pasticcerie, colazioni', desc: 'Le foto dei piatti girano su un anello tridimensionale: si muove scorrendo o trascinando.' },
  { id: 'qr', prezzo: 320, nome: 'Menù da tavolo', tecnica: 'Pensato per il telefono: schede, fogli dal basso, lista', adatto: 'Ristoranti con il codice QR sul tavolo, pub, lidi', desc: 'Si apre dal codice QR sul tavolo e si usa come un’app: le portate in alto, il piatto in un foglio che sale dal basso, la lista da mostrare al cameriere.' },
  { id: 'candela', prezzo: 300, nome: 'A lume di candela', tecnica: 'Una luce che segue il puntatore o il dito', adatto: 'Enoteche, wine bar, cene a lume di candela', desc: 'La pagina è in penombra: una fiamma calda segue il puntatore, o il dito, e illumina quello che leggi. Un tasto accende tutte le luci.' },
  { id: 'tovaglia', prezzo: 360, nome: 'Sulla tovaglia', tecnica: 'Trascinamento con inerzia e molle', adatto: 'Bistrot, brunch, locali informali', desc: 'Le foto dei piatti sono sparse su una tovaglia vista dall’alto: si spostano col dito, con l’inerzia, e si aprono al tocco.' },
];

/* Configurazione del catalogo. Metti qui la tua email: il pulsante "Invia la scelta" la usa come destinatario. */
window.CONFIG = {
  emailSviluppatore: '',
};
