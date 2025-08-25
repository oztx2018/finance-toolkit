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

function buildAmortization({
  principal,
  aprPct,
  years,
  extra = { monthly: 0, yearly: 0, once: { month: 0, amount: 0 } }
}) {
  const n = Math.round(years * 12);
  const r = aprPct > 0 ? aprPct / 100 / 12 : 0;
  const basePayment = r === 0 ? (n > 0 ? principal / n : principal) :
    (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const schedule = [];
  let balance = principal;
  let month = 1;
  let totalInterest = 0;

  while (balance > 0 && month <= n + 1000) {
    const interest = r * balance;

    const extraMonthly = toNumber(extra?.monthly);
    const extraYearly = month % 12 === 0 ? toNumber(extra?.yearly) : 0;
    const onceCfg = extra?.once || {};
    const extraOnce = month === toNumber(onceCfg.month) ? toNumber(onceCfg.amount) : 0;

    const extraThisMonth = Math.max(0, extraMonthly + extraYearly + extraOnce);

    let principalPortion = basePayment - interest + extraThisMonth;
    if (principalPortion > balance) principalPortion = balance;

    const endBalance = balance - principalPortion;

    schedule.push({
      month,
      paymentBase: basePayment,
      extra: extraThisMonth,
      payment: basePayment + extraThisMonth,
      interest,
      principal: principalPortion,
      balance: Math.max(0, endBalance),
    });

    totalInterest += interest;
    balance = endBalance;
    month += 1;

    if (r === 0 && extraThisMonth <= 0 && month > n) break;
  }

  const monthsToPayoff = schedule.length;
  const totalPaid = schedule.reduce((s, m) => s + m.payment, 0);
  return { payment: basePayment, schedule, totalInterest, totalPaid, monthsToPayoff };
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
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [extraYearly, setExtraYearly] = useState(0);
  const [extraOnceMonth, setExtraOnceMonth] = useState(0); // e.g., 6 means at month 6
  const [extraOnceAmount, setExtraOnceAmount] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [showAll, setShowAll] = useState(false);

 // replace the useMemo that calls buildAmortization
const { payment, schedule, totalInterest, totalPaid, monthsToPayoff } = useMemo(
  () =>
    buildAmortization({
      principal: toNumber(principal),
      aprPct: toNumber(apr),
      years: toNumber(years),
      extra: {
        monthly: toNumber(extraMonthly),
        yearly: toNumber(extraYearly),
        once: { month: Math.round(toNumber(extraOnceMonth)), amount: toNumber(extraOnceAmount) },
      },
    }),
  [principal, apr, years, extraMonthly, extraYearly, extraOnceMonth, extraOnceAmount]
);


  const visibleRows = showAll ? schedule : schedule.slice(0, 12);
  // replace csvRows definition so it includes Extra and Total Payment
const csvRows = useMemo(() => {
  return [
    ['Month', 'Payment (Base)', 'Extra', 'Total Payment', 'Interest', 'Principal', 'Balance'],
    ...schedule.map((m) => [
      m.month,
      m.paymentBase.toFixed(2),
      m.extra.toFixed(2),
      m.payment.toFixed(2),
      m.interest.toFixed(2),
      m.principal.toFixed(2),
      m.balance.toFixed(2),
    ]),
  ];
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
          <Text fontSize="sm" color="gray.600">Currency</Text>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['USD', 'TRY', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Extra Principal (Monthly)</Text>
          <Input value={extraMonthly} onChange={(e) => setExtraMonthly(e.target.value)} type="number" step="10" />
        </Box>

        <Box>
          <Text fontSize="sm" color="gray.600">Extra Principal (Yearly, applied at month 12, 24, ...)</Text>
          <Input value={extraYearly} onChange={(e) => setExtraYearly(e.target.value)} type="number" step="50" />
        </Box>

        <Box>
          <Text fontSize="sm" color="gray.600">One-time Extra — Month #</Text>
          <Input value={extraOnceMonth} onChange={(e) => setExtraOnceMonth(e.target.value)} type="number" step="1" />
        </Box>

        <Box>
          <Text fontSize="sm" color="gray.600">One-time Extra — Amount</Text>
          <Input value={extraOnceAmount} onChange={(e) => setExtraOnceAmount(e.target.value)} type="number" step="50" />
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
              <Th>Month</Th>
              <Th>Payment (Base)</Th>
              <Th>Extra</Th>
              <Th>Total Payment</Th>
              <Th>Interest</Th>
              <Th>Principal</Th>
              <Th>Balance</Th>
            </Tr>
          </Thead>
          <Tbody>
            {visibleRows.map((m) => (
              <Tr key={m.month}>
                <Td>{m.month}</Td>
                <Td>{fmtMoney(m.paymentBase, currency)}</Td>
                <Td>{fmtMoney(m.extra, currency)}</Td>
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

function CurrencyConverter() {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState('USD');   // default USD
  const [to, setTo] = useState('EUR');       // common choice: Euro
  const [rates, setRates] = useState({ USD: 1 });
  const [status, setStatus] = useState('offline');

  // Focus on most used foreign currencies in the U.S.
  const priorityList = [
    'USD', 'EUR', 'GBP', 'CAD', 'MXN',
    'JPY', 'CNY', 'CHF', 'AUD', 'INR', 'KRW'
  ];

  // Build dropdown list from API but reorder by priority
  const currencyList = useMemo(() => {
    const keys = Object.keys(rates || {});
    if (!keys.length) return priorityList;
    // Keep priority order, then add extras
    const extra = keys.filter(k => !priorityList.includes(k));
    return [...priorityList, ...extra.sort()];
  }, [rates]);

  // Convert using USD as pivot: amt * (rate[to] / rate[from])
  const convert = (amt, fromCode, toCode) => {
    if (fromCode === toCode) return amt;
    const rFrom = rates[fromCode];
    const rTo   = rates[toCode];
    if (!rFrom || !rTo) return 0;
    return amt * (rTo / rFrom);
  };
  const result = useMemo(() => convert(toNumber(amount), from, to), [amount, from, to, rates]);

  // Load/save last known rates (so the UI still works offline)
  const loadCachedRates = () => {
    try {
      const raw = localStorage.getItem('ft_rates_usd');
      if (!raw) return null;
      const { ts, rates } = JSON.parse(raw);
      // accept cache up to 24h old
      if (Date.now() - ts < 24 * 60 * 60 * 1000 && rates && rates.USD === 1) return rates;
    } catch {}
    return null;
  };

  const fetchRates = async () => {
    try {
      setStatus('loading');
      const res = await fetch('https://api.exchangerate.host/latest?base=USD&places=8');
      const data = await res.json();
      if (data && data.rates) {
        const next = { USD: 1, ...data.rates }; // ensure USD exists
        setRates(next);
        setStatus('live');
        try {
          localStorage.setItem('ft_rates_usd', JSON.stringify({ ts: Date.now(), rates: next }));
        } catch {}
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    const cached = loadCachedRates();
    if (cached) setRates(cached);
    fetchRates();
  }, []);

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white', 'gray.900')} p={6}>
      <Heading size="md" mb={4}>Currency Converter</Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Box>
          <Text fontSize="sm" color="gray.600">Amount</Text>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">From</Text>
          <Select value={from} onChange={(e) => setFrom(e.target.value)}>
            {currencyList.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">To</Text>
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            {currencyList.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Box>
      </SimpleGrid>

      <HStack mt={4} spacing={3}>
        <Button variant="outline" onClick={() => { const a = from; setFrom(to); setTo(a); }}>Swap</Button>
        <Button onClick={fetchRates}>Fetch Live Rates</Button>
        <Badge colorScheme={status === 'live' ? 'green' : status === 'loading' ? 'yellow' : 'gray'}>
          {status}
        </Badge>
      </HStack>

      <Box mt={6}>
        <StatCard label="Converted" value={fmtMoney(result, to)} />
      </Box>
    </Box>
  );
};

// -------------------- TAX CALCULATOR --------------------
function TaxCalculator() {
  const [income, setIncome] = useState(400000); // annual
  const [currency, setCurrency] = useState('USD');  
  const [preset, setPreset] = useState('US');  
  const priorityCurrencies = [
    'USD','EUR','GBP','CAD','MXN','JPY','CNY','CHF','AUD','INR','KRW'
  ];
    
  const [brackets, setBrackets] = useState([
    { upTo: 110000, rate: 0.15 },
    { upTo: 230000, rate: 0.20 },
    { upTo: 870000, rate: 0.27 },
    { upTo: 3000000, rate: 0.35 },
    { upTo: Infinity, rate: 0.40 },
  ]);

   const applyPreset = (p) => {
    setPreset(p);
    if (p === 'TR') {
      setBrackets([
        { upTo: 110000, rate: 0.15 },
        { upTo: 230000, rate: 0.20 },
        { upTo: 870000, rate: 0.27 },
        { upTo: 3000000, rate: 0.35 },
        { upTo: Infinity, rate: 0.40 },
      ]);
      setCurrency('TRY');
    } else if (p === 'US') {
      setBrackets([
        { upTo: 11600, rate: 0.10 },
        { upTo: 47150, rate: 0.12 },
        { upTo: 100525, rate: 0.22 },
        { upTo: 191950, rate: 0.24 },
        { upTo: 243725, rate: 0.32 },
        { upTo: 609350, rate: 0.35 },
        { upTo: Infinity, rate: 0.37 },
      ]);
      setCurrency('USD');
    }
  };


  const computeTax = (annual, bands) => {
    let remaining = annual;
    let lastCap = 0;
    let tax = 0;
    const rows = [];
    for (const b of bands) {
      const cap = isFinite(b.upTo) ? b.upTo : remaining + lastCap;
      const slice = Math.max(0, Math.min(remaining, cap - lastCap));
      const due = slice * b.rate;
      if (slice > 0) rows.push({ upto: cap, slice, rate: b.rate, due });
      tax += due;
      remaining -= slice;
      lastCap = cap;
      if (remaining <= 0) break;
    }
    const effective = annual > 0 ? tax / annual : 0;
    return { tax, effective, rows };
  };

  const { tax, effective, rows } = useMemo(
    () => computeTax(toNumber(income), brackets),
    [income, brackets]
  );

  const updateBracket = (idx, key, val) => {
    setBrackets(bs =>
      bs.map((b, i) =>
        i === idx
          ? { ...b, [key]: key === 'rate' ? toNumber(val) : (val === 'Infinity' ? Infinity : toNumber(val)) }
          : b
      )
    );
  };

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white', 'gray.900')} p={6}>
      <Heading size="md" mb={4}>Income Tax Calculator <Badge ml={2}>Beta</Badge></Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Box>
          <Text fontSize="sm" color="gray.600">Annual Income</Text>
          <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Currency</Text>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {priorityCurrencies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Preset</Text>
          <Select value={preset} onChange={(e) => applyPreset(e.target.value)}>
            <option value="TR">Türkiye (example)</option>
            <option value="US">US (example)</option>
            <option value="CUSTOM">Custom</option>
          </Select>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={4}>
        <StatCard label="Estimated Tax" value={fmtMoney(tax, currency)} />
        <StatCard label="Effective Rate" value={(effective * 100).toFixed(2) + '%'} />
        <StatCard label="After-Tax Income" value={fmtMoney(toNumber(income) - tax, currency)} />
        <StatCard label="Brackets Used" value={rows.length} />
      </SimpleGrid>

      <Box mt={4}>
        <Heading size="sm" mb={2}>Brackets (edit as needed)</Heading>
        <Box overflowX="auto" borderWidth="1px" rounded="xl">
          <Table size="sm">
            <Thead bg={useColorModeValue('gray.50', 'gray.800')}>
              <Tr><Th>Up to (annual)</Th><Th>Rate</Th><Th>Slice</Th><Th>Tax</Th></Tr>
            </Thead>
            <Tbody>
              {brackets.map((b, i) => (
                <Tr key={i}>
                  <Td>
                    <Input size="sm" value={isFinite(b.upTo) ? b.upTo : 'Infinity'}
                      onChange={(e) => updateBracket(i, 'upTo', e.target.value)} />
                  </Td>
                  <Td>
                    <Input size="sm" value={b.rate}
                      onChange={(e) => updateBracket(i, 'rate', e.target.value)} />
                  </Td>
                  <Td>{fmtMoney(rows[i]?.slice || 0, currency)}</Td>
                  <Td>{fmtMoney(rows[i]?.due || 0, currency)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        <Text fontSize="xs" color="gray.500" mt={2}>
          These brackets are example defaults. Please verify and adjust to current rules for your country.
        </Text>
      </Box>
    </Box>
  );
};

// -------------------- RETIREMENT CALCULATOR --------------------
function RetirementCalculator() {
  const [age, setAge] = useState(30);
  const [retireAge, setRetireAge] = useState(65);
  const [current, setCurrent] = useState(100000);
  const [monthly, setMonthly] = useState(500);
  const [returnPct, setReturnPct] = useState(7);
  const [inflationPct, setInflationPct] = useState(2.5);
  const [currency, setCurrency] = useState('TRY');

  const months = useMemo(()=> Math.max(0, (toNumber(retireAge)-toNumber(age)) * 12), [age, retireAge]);
  const r = useMemo(()=> (toNumber(returnPct)/100)/12, [returnPct]);
  const i = useMemo(()=> (toNumber(inflationPct)/100)/12, [inflationPct]);

  const fv = useMemo(()=> {
    const n = months;
    const P = toNumber(current);
    const PMT = toNumber(monthly);
    if (n <= 0) return { nominal: P, real: P, series: [] };
    const fvLump = P * Math.pow(1+r, n);
    const fvSeries = r === 0 ? PMT * n : PMT * ((Math.pow(1+r, n) - 1) / r);
    const nominal = fvLump + fvSeries;
    const real = i>0 ? nominal / Math.pow(1+i, n) : nominal;
    let bal = P; const series=[];
    for (let m=1;m<=n;m++){
      bal = bal*(1+r) + PMT;
      if (m%12===0)
        series.push({ year: m/12, nominal: Math.round(bal), real: Math.round(i>0 ? bal/Math.pow(1+i, m) : bal) });
    }
    return { nominal, real, series };
  }, [months, current, monthly, r, i]);

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white','gray.900')} p={6}>
      <Heading size="md" mb={4}>Retirement Calculator</Heading>
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        <Box><Text fontSize="sm" color="gray.600">Current Age</Text><Input type="number" value={age} onChange={(e)=>setAge(e.target.value)} /></Box>
        <Box><Text fontSize="sm" color="gray.600">Retirement Age</Text><Input type="number" value={retireAge} onChange={(e)=>setRetireAge(e.target.value)} /></Box>
        <Box><Text fontSize="sm" color="gray.600">Current Savings</Text><Input type="number" value={current} onChange={(e)=>setCurrent(e.target.value)} /></Box>
        <Box><Text fontSize="sm" color="gray.600">Monthly Contribution</Text><Input type="number" value={monthly} onChange={(e)=>setMonthly(e.target.value)} /></Box>
        <Box><Text fontSize="sm" color="gray.600">Expected Return % (annual)</Text><Input type="number" step="0.1" value={returnPct} onChange={(e)=>setReturnPct(e.target.value)} /></Box>
        <Box><Text fontSize="sm" color="gray.600">Inflation % (annual)</Text><Input type="number" step="0.1" value={inflationPct} onChange={(e)=>setInflationPct(e.target.value)} /></Box>
        <Box><Text fontSize="sm" color="gray.600">Currency</Text>
          <Select value={currency} onChange={(e)=>setCurrency(e.target.value)}>
            {['TRY','USD','EUR','GBP'].map(c=> <option key={c} value={c}>{c}</option>)}
          </Select>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={4}>
        <StatCard label="At Retirement (nominal)" value={fmtMoney(fv.nominal, currency)} />
        <StatCard label="At Retirement (real)" value={fmtMoney(fv.real, currency)} />
        <StatCard label="Months to Retire" value={months} />
        <StatCard label="Monthly Return (r)" value={(r*100).toFixed(3)+'%'} />
      </SimpleGrid>

      <Box h={{ base: 240, md: 300 }} mt={4} borderWidth="1px" rounded="xl">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={fv.series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <XAxis dataKey="year" tickCount={6} />
            <YAxis tickCount={6} />
            <Tooltip formatter={(v)=> v.toLocaleString()} />
            <Area type="monotone" dataKey="real" stroke="none" fill="#60A5FA" fillOpacity={0.5} name="Real" />
            <Area type="monotone" dataKey="nominal" stroke="none" fill="#A78BFA" fillOpacity={0.4} name="Nominal" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
      <Text fontSize="xs" color="gray.500" mt={2}>
        Assumes monthly compounding and constant rates; results are estimates, not financial advice.
      </Text>
    </Box>
  );
};

function CryptoProfitCalculator() {
  const [currency, setCurrency] = useState('USD');
  const [symbol, setSymbol] = useState('BTC');
  const [buyPrice, setBuyPrice] = useState(30000);
  const [sellPrice, setSellPrice] = useState(35000);
  const [qty, setQty] = useState(0.1);
  const [feePct, setFeePct] = useState(0.1); // per trade, percent

  const fees = useMemo(() => {
    const bp = toNumber(buyPrice);
    const sp = toNumber(sellPrice);
    const q = toNumber(qty);
    const f = toNumber(feePct) / 100;
    const buyFee = bp * q * f;
    const sellFee = sp * q * f;
    return { buyFee, sellFee, total: buyFee + sellFee };
  }, [buyPrice, sellPrice, qty, feePct]);

  const { cost, proceeds, pnl, roi } = useMemo(() => {
    const bp = toNumber(buyPrice);
    const sp = toNumber(sellPrice);
    const q = toNumber(qty);
    const grossCost = bp * q;
    const grossProceeds = sp * q;
    const cost = grossCost + fees.buyFee;
    const proceeds = grossProceeds - fees.sellFee;
    const pnl = proceeds - cost;
    const roi = cost > 0 ? pnl / cost : 0;
    return { cost, proceeds, pnl, roi };
  }, [buyPrice, sellPrice, qty, fees]);

  const breakevenPrice = useMemo(() => {
    const q = toNumber(qty);
    const f = toNumber(feePct) / 100;
    if (q <= 0) return 0;
    // Solve: (P*q - P*q*f) - (bp*q + bp*q*f) = 0  =>  P*(1 - f) = bp*(1 + f)
    const bp = toNumber(buyPrice);
    return (bp * (1 + f)) / (1 - f);
  }, [buyPrice, qty, feePct]);

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white','gray.900')} p={6}>
      <Heading size="md" mb={4}>Crypto Profit Calculator</Heading>
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        <Box>
          <Text fontSize="sm" color="gray.600">Symbol</Text>
          <Select value={symbol} onChange={(e)=>setSymbol(e.target.value)}>
            {['BTC','ETH','SOL','XRP','ADA','DOGE'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Buy Price</Text>
          <Input type="number" step="0.01" value={buyPrice} onChange={(e)=>setBuyPrice(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Sell Price</Text>
          <Input type="number" step="0.01" value={sellPrice} onChange={(e)=>setSellPrice(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Quantity</Text>
          <Input type="number" step="0.0001" value={qty} onChange={(e)=>setQty(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Fee % (per trade)</Text>
          <Input type="number" step="0.01" value={feePct} onChange={(e)=>setFeePct(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Currency</Text>
          <Select value={currency} onChange={(e)=>setCurrency(e.target.value)}>
            {['USD','EUR','GBP','TRY'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={4}>
        <StatCard label="Total Cost" value={fmtMoney(cost, currency)} />
        <StatCard label="Proceeds" value={fmtMoney(proceeds, currency)} />
        <StatCard label="PnL" value={fmtMoney(pnl, currency)} />
        <StatCard label="ROI" value={(roi*100).toFixed(2) + '%'} />
      </SimpleGrid>

      <Box mt={4}>
        <Text fontSize="sm" color="gray.600">Fees (buy / sell): {fmtMoney(fees.buyFee, currency)} / {fmtMoney(fees.sellFee, currency)}</Text>
        <Text fontSize="sm" color="gray.600">Break-even Sell Price: {fmtMoney(breakevenPrice, currency)}</Text>
      </Box>
      <Text fontSize="xs" color="gray.500" mt={2}>For education only. No financial advice.</Text>
    </Box>
  );
};

function StockSplitCalculator() {
  const [shares, setShares] = useState(100);
  const [price, setPrice] = useState(50);
  const [a, setA] = useState(3); // 3-for-1 => a=3, b=1
  const [b, setB] = useState(1);
  const [currency, setCurrency] = useState('USD');

  const { newShares, newPrice, valueBefore, valueAfter } = useMemo(() => {
    const s = toNumber(shares);
    const p = toNumber(price);
    const A = Math.max(1, toNumber(a));
    const B = Math.max(1, toNumber(b));
    const ratio = A / B;
    const newShares = s * ratio;
    const newPrice = p / ratio;
    const valueBefore = s * p;
    const valueAfter = newShares * newPrice;
    return { newShares, newPrice, valueBefore, valueAfter };
  }, [shares, price, a, b]);

  return (
    <Box rounded="2xl" boxShadow="sm" borderWidth="1px" bg={useColorModeValue('white','gray.900')} p={6}>
      <Heading size="md" mb={4}>Stock Split Calculator</Heading>
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        <Box><Text fontSize="sm" color="gray.600">Current Shares</Text><Input type="number" value={shares} onChange={(e)=>setShares(e.target.value)} /></Box>
        <Box><Text fontSize="sm" color="gray.600">Current Price</Text><Input type="number" step="0.01" value={price} onChange={(e)=>setPrice(e.target.value)} /></Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Split Ratio (A : B)</Text>
          <SimpleGrid columns={2} spacing={2}>
            <Input type="number" value={a} onChange={(e)=>setA(e.target.value)} />
            <Input type="number" value={b} onChange={(e)=>setB(e.target.value)} />
          </SimpleGrid>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.600">Currency</Text>
          <Select value={currency} onChange={(e)=>setCurrency(e.target.value)}>
            {['USD','EUR','GBP','TRY'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={4}>
        <StatCard label="New Shares" value={newShares.toLocaleString()} />
        <StatCard label="New Price" value={fmtMoney(newPrice, currency)} />
        <StatCard label="Value Before" value={fmtMoney(valueBefore, currency)} />
        <StatCard label="Value After" value={fmtMoney(valueAfter, currency)} />
      </SimpleGrid>

      <Text fontSize="xs" color="gray.500" mt={2}>Total value stays the same at the moment of the split (ignoring taxes/fees).</Text>
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
            <Tab>Tax</Tab>
            <Tab>Retirement</Tab>
            <Tab>Crypto Profit</Tab>
            <Tab>Stock Split</Tab>
          </TabList>
          <TabPanels mt={4}>
            <TabPanel><LoanCalculator /></TabPanel>
            <TabPanel><MortgageCalculator /></TabPanel>
            <TabPanel><CurrencyConverter /></TabPanel>
            <TabPanel><TaxCalculator /></TabPanel>
            <TabPanel><RetirementCalculator /></TabPanel>
            <TabPanel><CryptoProfitCalculator /></TabPanel>
            <TabPanel><StockSplitCalculator /></TabPanel>
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