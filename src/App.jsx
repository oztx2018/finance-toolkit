import React, { useMemo, useState, useEffect } from 'react';
import {
Box, Container, Heading, Text, SimpleGrid, Input, Select, Button, Stat, StatLabel, StatNumber,
Table, Thead, Tbody, Tr, Th, Td, useColorModeValue, Tabs, Tab, TabList, TabPanels, TabPanel, HStack, Badge, IconButton, useColorMode, Link as CLink
} from '@chakra-ui/react';
import { Helmet } from 'react-helmet-async';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Blog from './pages/Blog.jsx';                 
import Post from './pages/Post.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import {POSTS} from './post.js';

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const toNumber = (v, fallback = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
};
const fmtMoney = (v, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(isNaN(v) ? 0 : v);

const downloadCSV = (rows, filename = 'amortization.csv') => {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/\"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function buildAmortization({ principal, aprPct, years, extraMonthly = 0 }) {
  const n = Math.round(years * 12);
  const r = aprPct > 0 ? aprPct / 100 / 12 : 0;
  const payment = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const schedule = [];
  let balance = principal;
  let month = 1;
  let totalInterest = 0;

  while (balance > 0 && month <= n + 1000) {
    const interest = r * balance;
    let principalPortion = payment - interest + extraMonthly;
    if (principalPortion > balance) principalPortion = balance;
    const endBalance = balance - principalPortion;

    schedule.push({
      month,
      payment: payment + extraMonthly,
      interest,
      principal: principalPortion,
      balance: Math.max(0, endBalance),
    });

    totalInterest += interest;
    balance = endBalance;
    month += 1;
    if (r === 0 && extraMonthly <= 0 && month > n) break;
  }

  const monthsToPayoff = schedule.length;
  const totalPaid = schedule.reduce((s, m) => s + m.payment, 0);
  return { payment, schedule, totalInterest, totalPaid, monthsToPayoff };
}

function StatCard({ label, value }) {
  const bg = useColorModeValue('white', 'gray.800');
  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={bg} p={4}>
      <Stat>
        <StatLabel fontSize="xs" color="gray.500">{label}</StatLabel>
        <StatNumber fontSize="xl">{value}</StatNumber>
      </Stat>
    </Box>
  );
}

function LoanChart({ data }) {
  const stroke = useColorModeValue('#5B21B6', '#C4B5FD');
  return (
    <Box h={{ base: 220, md: 280 }} mt={4} borderWidth="1px" rounded="xl">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" tickCount={6} />
          <YAxis tickCount={6} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Line type="monotone" dataKey="balance" stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

function MortgageChart({ data }) {
  const fill1 = useColorModeValue('#A78BFA', '#7C3AED');
  const fill2 = useColorModeValue('#93C5FD', '#1D4ED8');
  return (
    <Box h={{ base: 220, md: 280 }} mt={4} borderWidth="1px" rounded="xl">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" tickCount={6} />
          <YAxis tickCount={6} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Area type="monotone" dataKey="interest" stackId="1" stroke="none" fill={fill1} fillOpacity={0.5} />
          <Area type="monotone" dataKey="principal" stackId="1" stroke="none" fill={fill2} fillOpacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

function LoanCalculator() {
  const [principal, setPrincipal] = useState(25000);
  const [apr, setApr] = useState(6.9);
  const [years, setYears] = useState(5);
  const [extra, setExtra] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [showAll, setShowAll] = useState(false);

  const { payment, schedule, totalInterest, totalPaid, monthsToPayoff } = useMemo(
    () => buildAmortization({ principal: toNumber(principal), aprPct: toNumber(apr), years: toNumber(years), extraMonthly: toNumber(extra) }),
    [principal, apr, years, extra]
  );

  const visibleRows = showAll ? schedule : schedule.slice(0, 12);
  const csvRows = useMemo(() => {
    return [['Month', 'Payment', 'Interest', 'Principal', 'Balance']].concat(
      schedule.map((m) => [m.month, m.payment.toFixed(2), m.interest.toFixed(2), m.principal.toFixed(2), m.balance.toFixed(2)])
    );
  }, [schedule]);

  // chart data: first 60 months (or all if shorter)
  const chartData = useMemo(() => schedule.slice(0, 60).map(m => ({ month: m.month, balance: Math.round(m.balance) })), [schedule]);

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white', 'gray.900')} p={6}>
      <Heading size="md" mb={4}>Loan Calculator</Heading>
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        <Box>
          <Text fontSize="sm" color="gray.600">Principal</Text>
          <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} type="number" step="100" />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">APR %</Text>
          <Input value={apr} onChange={(e) => setApr(e.target.value)} type="number" step="0.1" />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Term (years)</Text>
          <Input value={years} onChange={(e) => setYears(e.target.value)} type="number" step="1" />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Extra Monthly (optional)</Text>
          <Input value={extra} onChange={(e) => setExtra(e.target.value)} type="number" step="10" />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Currency</Text>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['USD', 'TRY', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={4}>
        <StatCard label="Base Monthly" value={fmtMoney(payment, currency)} />
        <StatCard label="Months to Payoff" value={monthsToPayoff} />
        <StatCard label="Total Interest" value={fmtMoney(totalInterest, currency)} />
        <StatCard label="Total Paid" value={fmtMoney(totalPaid, currency)} />
      </SimpleGrid>

      <LoanChart data={chartData} />

      <HStack mt={4} spacing={3}>
        <Button variant="outline" onClick={() => setShowAll(s => !s)}>{showAll ? 'Show First 12 Months' : 'Show Full Schedule'}</Button>
        <Button variant="outline" onClick={() => downloadCSV(csvRows)}>Download CSV</Button>
      </HStack>

      <Box mt={3} overflowX="auto" borderWidth="1px" rounded="xl">
        <Table size="sm">
          <Thead bg={useColorModeValue('gray.50', 'gray.800')}>
            <Tr>
              {['Month', 'Payment', 'Interest', 'Principal', 'Balance'].map(h => <Th key={h}>{h}</Th>)}
            </Tr>
          </Thead>
          <Tbody>
            {visibleRows.map((m) => (
              <Tr key={m.month}>
                <Td>{m.month}</Td>
                <Td>{fmtMoney(m.payment, currency)}</Td>
                <Td>{fmtMoney(m.interest, currency)}</Td>
                <Td>{fmtMoney(m.principal, currency)}</Td>
                <Td>{fmtMoney(m.balance, currency)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState(450000);
  const [downPct, setDownPct] = useState(20);
  const [apr, setApr] = useState(6.75);
  const [years, setYears] = useState(30);
  const [taxMonthly, setTaxMonthly] = useState(350);
  const [insMonthly, setInsMonthly] = useState(120);
  const [hoaMonthly, setHoaMonthly] = useState(60);
  const [currency, setCurrency] = useState('USD');

  const principal = useMemo(() => {
    const dp = toNumber(homePrice) * toNumber(downPct) / 100;
    return Math.max(0, toNumber(homePrice) - dp);
  }, [homePrice, downPct]);

  const { payment: baseMonthly, schedule, totalInterest } = useMemo(
    () => buildAmortization({ principal, aprPct: toNumber(apr), years: toNumber(years), extraMonthly: 0 }),
    [principal, apr, years]
  );

  const extras = toNumber(taxMonthly) + toNumber(insMonthly) + toNumber(hoaMonthly);
  const totalMonthly = baseMonthly + extras;
  const totalPaid = schedule.reduce((s, m) => s + m.payment, 0) + extras * schedule.length;

  const chartData = useMemo(() => schedule.slice(0, 60).map(m => ({ month: m.month, interest: Math.round(m.interest), principal: Math.round(m.principal) })), [schedule]);

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white', 'gray.900')} p={6}>
      <Heading size="md" mb={4}>Mortgage Calculator</Heading>
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        <Box><Text fontSize="sm" color="gray.600">Home Price</Text><Input value={homePrice} onChange={(e) => setHomePrice(e.target.value)} type="number" step="1000" /></Box>
        <Box><Text fontSize="sm" color="gray.600">Down Payment %</Text><Input value={downPct} onChange={(e) => setDownPct(clamp(toNumber(e.target.value), 0, 100))} type="number" step="1" /></Box>
        <Box><Text fontSize="sm" color="gray.600">APR %</Text><Input value={apr} onChange={(e) => setApr(e.target.value)} type="number" step="0.1" /></Box>
        <Box><Text fontSize="sm" color="gray.600">Term (years)</Text><Input value={years} onChange={(e) => setYears(e.target.value)} type="number" step="1" /></Box>
        <Box><Text fontSize="sm" color="gray.600">Property Tax / mo</Text><Input value={taxMonthly} onChange={(e) => setTaxMonthly(e.target.value)} type="number" step="10" /></Box>
        <Box><Text fontSize="sm" color="gray.600">Insurance / mo</Text><Input value={insMonthly} onChange={(e) => setInsMonthly(e.target.value)} type="number" step="5" /></Box>
        <Box><Text fontSize="sm" color="gray.600">HOA / mo</Text><Input value={hoaMonthly} onChange={(e) => setHoaMonthly(e.target.value)} type="number" step="5" /></Box>
        <Box><Text fontSize="sm" color="gray.600">Currency</Text><Select value={currency} onChange={(e) => setCurrency(e.target.value)}>{['USD','TRY','EUR','GBP'].map(c => <option key={c} value={c}>{c}</option>)}</Select></Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} mt={4}>
        <StatCard label="Loan Principal" value={fmtMoney(principal, currency)} />
        <StatCard label="Base Monthly (P&I)" value={fmtMoney(baseMonthly, currency)} />
        <StatCard label="Monthly Extras" value={fmtMoney(extras, currency)} />
        <StatCard label="TOTAL Monthly" value={fmtMoney(totalMonthly, currency)} />
        <StatCard label="Total Interest (P&I)" value={fmtMoney(totalInterest, currency)} />
        <StatCard label="Total Cost (incl. extras)" value={fmtMoney(totalPaid, currency)} />
      </SimpleGrid>

      <MortgageChart data={chartData} />

      <Box mt={3} overflowX="auto" borderWidth="1px" rounded="xl">
        <Table size="sm">
          <Thead bg={useColorModeValue('gray.50', 'gray.800')}>
            <Tr>{['Month','Payment (P&I)','Interest','Principal','Balance'].map(h => <Th key={h}>{h}</Th>)}</Tr>
          </Thead>
          <Tbody>
            {schedule.slice(0, 12).map((m) => (
              <Tr key={m.month}>
                <Td>{m.month}</Td>
                <Td>{fmtMoney(m.payment, currency)}</Td>
                <Td>{fmtMoney(m.interest, currency)}</Td>
                <Td>{fmtMoney(m.principal, currency)}</Td>
                <Td>{fmtMoney(m.balance, currency)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

const DEFAULT_RATES_USD = { EUR: 0.91, TRY: 34.0, GBP: 0.77, AUD: 1.48, CAD: 1.35, JPY: 155.0, USD: 1 };
function CurrencyConverter() {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [rates, setRates] = useState(DEFAULT_RATES_USD);
  const [status, setStatus] = useState('offline');

  const currencies = ['USD','EUR','GBP','AUD','CAD','JPY','TRY','INR','CNY','CHF','HKD','NZD','SEK','KRW','SGD','NOK','MXN','RUB','ZAR'];

  const convert = (amt, fromCode, toCode) => {
    if (!rates[fromCode] || !rates[toCode]) return 0;
    const amtInUSD = amt / (rates[fromCode] || 1);
    return amtInUSD * (rates[toCode] || 1);
  };
  const result = useMemo(() => convert(toNumber(amount), from, to), [amount, from, to, rates]);

  const fetchRates = async () => {
    try {
      setStatus('loading');
      const res = await fetch('https://api.exchangerate.host/latest?base=USD');
      const data = await res.json();
      if (data && data.rates) {
        const next = { ...DEFAULT_RATES_USD };
        for (const c of Object.keys(next)) {
          if (data.rates[c]) next[c] = data.rates[c];
        }
        setRates(next);
        setStatus('live');
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => { fetchRates(); }, []);

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white', 'gray.900')} p={6}>
      <Heading size="md" mb={4}>Currency Converter</Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Box><Text fontSize="sm" color="gray.600">Amount</Text><Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="1" /></Box>
        <Box><Text fontSize="sm" color="gray.600">From</Text><Select value={from} onChange={(e) => setFrom(e.target.value)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</Select></Box>
        <Box><Text fontSize="sm" color="gray.600">To</Text><Select value={to} onChange={(e) => setTo(e.target.value)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</Select></Box>
      </SimpleGrid>
      <HStack mt={4} spacing={3}>
        <Button variant="outline" onClick={() => { const a = from; setFrom(to); setTo(a); }}>Swap</Button>
        <Button onClick={fetchRates}>Fetch Live Rates</Button>
        <Badge colorScheme={status === 'live' ? 'green' : status === 'loading' ? 'yellow' : 'gray'}>{status}</Badge>
      </HStack>
      <Box mt={6}>
        <StatCard label="Converted" value={fmtMoney(result, to)} />
      </Box>
    </Box>
  );
}

function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  return (
    <IconButton
      aria-label="Toggle color mode"
      onClick={toggleColorMode}
      icon={isDark ? <SunIcon /> : <MoonIcon />}
      variant="ghost"
    />
  );
};

function FAQJsonLD() {
const faqs = [
// EN
{ q: 'How is the monthly loan payment calculated?', a: 'We use the standard amortization formula with the given APR and term, returning principal and interest split.' },
{ q: 'Do the mortgage results include taxes and insurance?', a: 'Yes. You can enter monthly estimates for property tax, insurance, and HOA to include them.' },
{ q: 'Are currency rates live?', a: 'We fetch recent rates from exchangerate.host and fall back to offline defaults if unavailable.' },
{ q: 'Can I download the amortization schedule?', a: 'Yes. Use the Download CSV button to export your full schedule.' },
{ q: 'Is this financial advice?', a: 'No. This tool is for educational purposes only and does not constitute financial advice.' },
// TR
{ q: 'Aylık kredi taksiti nasıl hesaplanır?', a: 'APR (yıllık faiz) ve vade ile standart amortisman formülü kullanılır; taksit, faiz ve anapara olarak ayrıştırılır.' },
{ q: 'Konut kredisi sonucuna vergi ve sigorta dahil mi?', a: 'Evet. Aylık emlak vergisi, sigorta ve site aidatı (HOA) alanlarına değer girerek toplam tutara ekleyebilirsiniz.' },
{ q: 'Kur değerleri canlı mı?', a: 'USD bazlı güncel kurları exchangerate.host üzerinden çekiyoruz; servis erişilemezse varsayılan değerlere geri düşer.' },
{ q: 'Amortisman tablosunu indirebilir miyim?', a: 'Evet. Tam tabloyu indirmek için CSV indir butonunu kullanabilirsiniz.' },
{ q: 'Bu uygulama finansal danışmanlık sağlar mı?', a: 'Hayır. Bu araç yalnızca eğitim amaçlıdır ve finansal danışmanlık değildir.' }
];
const json = {
'@context': 'https://schema.org',
'@type': 'FAQPage',
mainEntity: faqs.map(({ q, a }) => ({
'@type': 'Question',
name: q,
acceptedAnswer: { '@type': 'Answer', text: a }
}))
};
return (
<Helmet>
<script type="application/ld+json">{JSON.stringify(json)}</script>
</Helmet>
);
}


function Home() {
  const bg = useColorModeValue('gray.50', 'gray.800');
  const headerBg = useColorModeValue('whiteAlpha.800', 'gray.900');
  useEffect(() => { document.title = 'Finance Toolkit – Loan • Mortgage • Currency'; }, []);
  return (
    <Box minH="100vh" bg={bg}>
      <Helmet>
        <title>Finance Toolkit – Loan • Mortgage • Currency</title>
        <meta name="description" content="Loan calculator with amortization, mortgage calculator with taxes & insurance, and currency converter with live rates." />
        <link rel="canonical" href="https://financetool.net/" />
      </Helmet>
      <FAQJsonLD />


      <Container maxW="6xl" py={{ base: 6, md: 10 }}>
        <Tabs variant="soft-rounded" colorScheme="purple">
          <TabList flexWrap="wrap">
            <Tab>Loan</Tab>
            <Tab>Mortgage</Tab>
            <Tab>Currency</Tab>
          </TabList>
          <TabPanels mt={4}>
            <TabPanel><LoanCalculator /></TabPanel>
            <TabPanel><MortgageCalculator /></TabPanel>
            <TabPanel><CurrencyConverter /></TabPanel>
          </TabPanels>
        </Tabs>


        <Box mt={10}>
          <Text fontSize="xs" color="gray.500">Disclaimer: This tool is for educational purposes only and does not constitute financial advice. Rates and results are estimates.</Text>
        </Box>
      </Container>
      </Box>
  );
};

export default function App() {
  const headerBg = useColorModeValue('whiteAlpha.800', 'gray.900');
  const footerBg = useColorModeValue('white', 'gray.900');
  return (
    <HashRouter>
      <Box position="sticky" top="0" zIndex="10" bg={headerBg} backdropFilter="saturate(180%) blur(8px)" borderBottomWidth="1px">
        <Container maxW="6xl" py={3} display="flex" alignItems="center" justifyContent="space-between">
          <HStack spacing={3}>
            <Box w="36px" h="36px" bg="purple.600" color="white" rounded="xl" display="grid" placeItems="center" fontWeight="bold">FT</Box>
            <Box>
              <Heading size="md">Finance Toolkit</Heading>
              <Text fontSize="xs" color="gray.500">Loan • Mortgage • Currency</Text>
            </Box>
          </HStack>
          <HStack spacing={5}>
            <CLink as={Link} to="/" fontSize="sm">Home</CLink>
            <CLink as={Link} to="/blog" fontSize="sm">Blog</CLink>
            <CLink as={Link} to="/privacy" fontSize="sm">Privacy</CLink>
            <CLink as={Link} to="/terms" fontSize="sm">Terms</CLink>
            <ThemeToggle />
          </HStack>
        </Container>
      </Box>


      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<Post />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>


      <Box as="footer" bg={footerBg} borderTopWidth="1px" mt={10}>
        <Container maxW="6xl" py={6} display="flex" gap={4} flexWrap="wrap" justifyContent="space-between" alignItems="center">
          <Text fontSize="sm" color="gray.500">© {new Date().getFullYear()} Finance Toolkit</Text>
          <HStack spacing={4}>
            <CLink as={Link} to="/privacy" fontSize="sm" color="purple.600">Privacy</CLink>
            <CLink as={Link} to="/terms" fontSize="sm" color="purple.600">Terms</CLink>
            <CLink as={Link} to="/blog" fontSize="sm" color="purple.600">Blog</CLink>
          </HStack>
        </Container>
      </Box>
    </HashRouter>
  );
}