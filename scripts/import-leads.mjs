import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qrlkicsxnhaplwkotnyd.supabase.co';
const SERVICE_KEY = process.env.VITE_SUPABASE_CLI_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const raw = [
  "1	Avinash	7396679780		PG Building	",
  "2	Harsha Reddy TG	1 (737) 895-6342		PG Building	3 Cr",
  "3	Gaurav Deopjai	7775959453		PG Building	4 Cr",
  "4	Santosh TG	65 8424 8019		PG Building	4 Cr",
  "5	Vivek Ka & TG	9880072333		PG Building	4 Cr",
  "6	Anil	9738109988		Rental Income Building	5 Cr",
  "7	Kaushal	8884540889		PG Building	3 Cr",
  "8	Sai	9500178218			3.8 Cr",
  "9	Ashok	9962854883		PG Building	3 Cr",
  "10	Kaleem	8792880125		Commercial Building	5 Cr",
  "11	Yaswanth	9962626860		PG Building	8 Cr",
  "12	Tmail	89702 52002		PG Building	5 Cr",
  "13	Puna	7020988793		PG Building	",
  "14	Venkat	1 (858) 286-7805		Individual Building	2.2 Cr",
  "15	Govind Raj	1 (678) 266-2000		PG Building	",
  "16	Amrutha	8431857057		Commercial Building	3 Cr",
  "17	Pankajan	9946550770		PG Building, Commercial Building	2 Cr",
  "18	Dilip	8553893835		Individual Building	1.3 Cr",
  "19	Dr Nadeem Paha	9844103602		Rental Income Building	1.3 Cr",
  "20	Ekram	1 (647997-4823		Individual Building	1.3 Cr",
  "21	Pradeep	9901847492		Commercial Building	5 Cr",
  "22	Shivu	9535969161		Individual Building	2 Cr",
  "23	Reena Prasad	6364259900		Individual Building	1 Cr",
  "24	Grandhi Ram	9110337330		PG Building	3 Cr",
  "25	Zubair Ahmed	9900600956		PG Building	3 Cr",
  "26	Pruthvi	9686458280		PG Building	2.5 Cr",
  "27	Nelikanth	9945205002			",
  "28	Anjan Gujjar G V	7892040768		Commercial Building	3 Cr",
  "29	Siva	8179010725		Individual Building	1 Cr",
  "30	Ragavendra	8884449850		PG Building	3 Cr",
  "31	Karthikeyan	9886802594		Rental Income Building	3 Cr",
  "32	Kathir	8072776732		Rental Income Building	2 Cr",
  "33	Omer Sheriff	9845148166		Commercial Building	4 Cr",
  "34	Ramlal	9901892330			",
  "35	Dakshayini	9606741058		Rental Income Building	",
  "36	Priya Rajan	7989752343		PG Building	2 Cr",
  "37	Bikram	9845420771		Commercial Building	3.5 Cr",
  "38	Siva	1 (804300-9403		Individual Building	2 Cr",
  "39	Rakesh	1 (469) 667-0671		Commercial Building	5 Cr",
  "40	Bas Babu Chettiyar	7904216665			",
  "41	Priya	61 402 710 745		Commercial Building, PG Building	4 Cr",
  "42	Jamana Gowda	9611020234		Rental Income Building	",
  "43	Joti	8105453466			",
  "44	Deepika Amy	8088225568		Rental Income Building	2.2 Cr",
  "45	Suresh Babu	9686579136		Commercial Building	4 Cr",
  "46	Ronak Saif	8095467449			",
  "47	Srinivas	8919056627		PG Building	6 Cr",
  "48	Sapthagiri	9972013097			",
  "49	Praveen Kumar	9941055519		Rental Income Building	2 Cr",
  "50	Shaj JP	9060538771		PG Building	3 Cr",
  "51	Maha Lakshmi Jewellers	9844039864		PG Building	15 Cr",
  "52	Charjanajvi	1 (612) 484-9359		PG Building	5 Cr",
  "53	Mahendra	7204700016		Rental Income Building	1.5 Cr",
  "54	Raghav R26	8123613486		Rental Income Building	1 Cr",
  "55	Goutham	8660963977		PG Building	3 Cr",
  "56	Naveen Reddy Hyderabad	8885551082		PG Building	6 Cr",
  "57	Lokesh	9845535640		PG Building	5 Cr",
  "58	Ravindra	7989916392		PG Building	5 Cr",
  "59	Suresh	9900127827		PG Building	3 Cr",
  "60	Sachin	8904897167		PG Building	4.5 Cr",
  "61	Shreyas	9902030990		PG Building	4 Cr",
  "62	SD Vashishth	9050141002		PG Building	",
  "63	Kiran Gowda	9036310148		PG Building	3 Cr",
  "64	Ayyappa	8639207029		PG Building	3 Cr",
  "65	Abuduala	7723007000		Lease	",
  "66	Abdul Siddiq	9916435196		PG Building	10 Cr",
  "67	Mahmad Muzamilb	8660377435		PG Building	3 Cr",
  "68	Arfankhan	8073581086		PG Building	3 Cr",
  "69	Bala	1 (469) 386-2545		PG Building	5 Cr",
  "70	Veerendra Nandi	9880118118		PG Building	6 Cr",
  "71	Dhanushree TG	8105767992		Lease	",
  "72	Abhilash Reddy	9902591881		PG Building	4 Cr",
  "73	Varun from Canada	1 (647) 285-0737		PG Building	8 Cr",
  "74	Tajammul Khan	9845467700		PG Building	7 Cr",
  "75	Darshan Gowda	6364665117		PG Building	5 Cr",
  "76	Darshan	8884404400		PG Building	5 Cr",
  "77	Arivind	9880010017		Rental Income Building	1.5 Cr",
  "78	Prabhakar RT Nagar	8660888072		PG Building	5 Cr",
  "79	Nithin Reddy	9036950051		PG Building	10 Cr",
  "80	Jerald	9820642008		PG Building	15 Cr",
  "81	Vamsi Vamsi	9886032396		PG Building	5 Cr",
  "82	Mommhad	7708062362		PG Building	7 Cr",
  "83	Yeshwanth	9686860300		PG Building	4 Cr",
  "84	Rajeswara Valishekkagari	1 (650) 922-7343		PG Building	5 Cr",
  "85	Balaji TG	1 (469) 386-2545		PG Building	5 Cr",
  "86	Manish	8754564277		PG Building	4 Cr",
  "87	Venkata Krishna	9916322040		PG Building	4 Cr",
  "88	Bahnu	1 (234) 4050507		PG Building	5.5 Cr",
  "89	Bhaskar	8790424695		PG Building	3 Cr",
  "90	Mvswadeep TG	9000922866		PG Building	4 Cr",
  "91	Praveen K Ravalli	9880633889		PG Building	4.5 Cr",
  "92	Manoj	8884755496		PG Building	5 Cr",
  "93	CA Prem P Singh	8826514881		PG Building	5 Cr",
  "94	Sourabh Jain	7987454629		PG Building	4 Cr+",
  "95	Rashizhan	9731966066		PG Building	4 Cr",
  "96	Dr Goutham	9972195354		PG Building	4 Cr",
  "97	Kannan TN	7306562567		PG Building	5 Cr",
  "98	Akshay	9535599459		PG Building	7 Cr",
  "99	Chiru Gowda	9986685626		PG Building	15 Cr",
  "100	Nayana	6360050189		Individual Building	2.5 Cr",
  "101	Vivek	6593708117		Rental Income Building	1.5 Cr",
  "102	Yaseen	965 9788 7374		Individual Building, Rental Income Building	2.5 to 1.5 Cr",
  "103	Mazz	9740369484		Rental Income Building	1.2 Cr",
  "104	Keshav	9633973782		Rental Income Building	1.2 Cr",
  "105	Vivkith	9751588857		Rental Income Building	3 Cr",
  "106	Kavayashree	9845372925		Commercial Building	6 Cr",
  "107	Prakash	9000194444		Rental Income Building	3 Cr",
  "108	Ayub	9663472188		Rental Income Building	1.1 Cr",
  "109	Mr Nagachandhan	9480901257		Individual Building	1 Cr",
  "110	Gouthami	9880674706		Individual Building	1.1 Cr",
  "111	Nikhil KM	9901004208		Rental Income Building	2.5 Cr",
  "112	Subrat	8861778546		Rental Income Building	2 Cr",
  "113	Mohammad	9154164260		Rental Income Building	2 Cr",
  "114	Rajesh Dara	9739391741		Rental Income Building	3 Cr",
  "115	Abhi	8180-5314-0644		Commercial Building	",
  "116	Lokesh	7975750770		Commercial Building	10 Cr",
  "117	Sanjay Shivanand	8971280402		Individual Building	7 Cr",
  "118	Kiran	9019688933		Rental Income Building	1.4 Cr",
  "119	Prasad	7259563463		Rental Income Building	1 Cr",
  "120	Thilak	9738612701		PG Building	3.5 Cr",
  "121	Adnan	8660290050		PG Building	8 Cr+",
  "122	Vikram Baderiya	9902492777		PG Building	10 Cr",
  "123	Jino	9176020201		PG Building	10 Cr",
  "124	Gopinath	9553697722		PG Building	2 Cr",
  "125	Irfan Shaik	6301177413		PG Building	3 Cr",
  "126	Danaeshwar	9902326248		PG Building	4 Cr",
  "127	Swetha	8217507402		Rental Income Building	80 Lakh",
  "128	Chandra	9740603994		Rental Income Building	2 Cr",
  "129	Pavithra	8310372267		Rental Income Building	2 Cr",
  "130	Parjeal Shetty	9886579313		Rental Income Building	3 Cr",
  "131	AbhiRam	8904431973		Rental Income Building	2.5 Cr",
  "132	Anthony	8072911533		Rental Income Building	1.5 Cr",
  "133	Inayathali	9494995519		Commercial Building	100 Cr+",
  "134	Chidanand	9632396634		Rental Income Building	2 Cr",
  "135	Jovin	9902727006		Commercial Building	4 Cr",
  "136	Nikhil	9632054450		Rental Income Building	4 Cr",
  "137	Satika Culture	9400662731		Rental Income Building	3 Cr",
  "138	Reina Designer	9606542369		Commercial Building	4 Cr",
  "139	Prahaas	9686356515		Rental Income Building	4 Cr",
  "140	Sachin Gowda	9902444212		Rental Income Building	3 Cr",
  "141	Praveen	8951857189		PG Building	10 Cr",
  "142	Praveen Kumar	7899414222		PG Building	4 Cr",
  "143	Arjun	9620600143		PG Site	2 Cr",
  "144	Nageswar Punati	9880469809		PG Building	10 Cr",
  "145	Charan Babu	9676010479		Commercial Building	2 Cr",
  "146	Sreenivas Reddy	9966770416		Rental Income Building	3 to 4 Cr",
  "147	Mahanth	9986659868		Rental Income Building	1 Cr",
  "148	Bharath	9738550096		Semi Commercial	~3 Cr",
  "149	Vivekananthan	9865589142		PG Building	3 to 4.5 Cr",
  "150	Simil	9902956476		PG Building	Upto 7.5 Cr",
  "151	Kishore Reddy	8884067254		Commercial Building	2.5 Cr",
  "152	Sandhya B	7353947641		Residential	1.2 Cr",
  "153	Sunil	9986448824		PG Building	4.25 Cr",
  "154	Karthik	6361457380		Rental Income Building	3.8 Cr",
  "155	Navin	9900503733		Commercial Building	7 Cr",
  "156	Abhi	9110683970		Rental Income Building	25 Lakh",
  "157	Kranthi Kumar	9591339144		Commercial Building	20-25 Lakh",
  "158	Dhiraj	9900518469		Rental Income Building	4 Cr",
  "159	Karthik Nagaraj	+447407216624		Residential	5 Cr",
  "160	Rohit Patel	7019626878		Commercial Building	3 Cr",
  "161	Ashok	9535390988		Commercial Building	4 Cr",
  "162	Adhithya Bhat	8217591836		Commercial Building	2 Cr",
  "163	Venkat Rao	9989732694		Rental Income Building	8 Cr",
  "164	Vidya M H	9008809321		Rental Income Building	2 Cr",
  "165	Rakshith S Reddy	9901754803		Rental Income Building	2.5 to 3 Cr",
  "166	Praveen Krishnam	9840481000		PG Building	3.7 Cr",
  "167	Ram	9945019793		Commercial Building	5 to 6 Cr",
  "168	Rajashekharayya	9538431804		Rental Income Building	1.3 to 1.5 Cr",
  "169	Rudresh Chandra Shekar	9980918985		Commercial Building	3 to 5 Cr",
  "170	Nagendra	9731299955		Plot	25 Lakh",
  "171	Narasimma	8431420836		Rental Income Building	1.4 to 1.8 Cr",
  "172	Sheetal Gupta	9035396190		Commercial Building	4 Cr",
  "173	Mallikarjun	9920248255		Rental Income Building	6 Cr",
  "174	Jatin Anand	9857605589		Commercial Building	30 to 50 Cr",
  "175	Yashu Ammu	8970224257		Rental Income Building	75 to 95 Lakh",
  "176	Sai Naveen Bysanj	8897004215		Rental Income Building	3.5 Cr",
  "177	Ravi	9353451205		Rental Income Building	10 Cr",
  "178	Ramesh Sarai	9663539509		Rental Income Building	2 Cr",
  "179	Kishor	9845594559		Rental Income Building	3.5 Cr",
  "180	Pramod	9845545736		Commercial Building	Below 10 Cr",
  "181	Shreeshail Patil	9900171776		Rental Income Building	4 to 5 Cr",
  "182	K V Siva Reddy	9014151434		Rental Income Building	5 Cr",
  "183	Rithishkumar KR	8861609965		Rental Income Building	3 to 3.5 Cr",
  "184	Prashant Pawar	8075501721		Rental Income Building	4 to 8 Cr",
  "186	Manigandan	7708285546		Rental Income Building	1 to 1.2 Cr",
  "187	Rahul	7337620131		Commercial Building	5 Cr",
  "188	Athiqa	9591723332		Commercial Building	2 Cr",
  "189	Aravind Rajasekaran	9787652425		Rental Income Building	10 to 12 Cr",
  "190	Vikash Shaw	9731649225		Rental Income Building	2 Cr",
  "191	Harish Chandru	6474696139		Commercial Building	5 to 8 Cr",
  "192	Murthy	6361987023		Commercial Building	4 to 6 Cr",
  "193	P Harshith Reddy	9902334629		Commercial Building	8 Cr",
  "194	Shoba	9538381456		Commercial Building	3.5 Cr",
  "195	Sharan Kirsh	9500570522		Commercial Building	18 Cr",
  "196	Nagaarjuna Reddy	9945554009		PG Building	6.5 Cr",
  "197	Krupal Datta	9980326646		Rental Income Building	3 CR",
  "198	Adam Oberoi	9920339405		PG Building	6.5 Cr",
  "199	Abdul Fathah	8951650837		PG Building	6.5 Cr",
  "200	Yeshwanth	8904040432		PG Building	6.5 Cr",
  "201	Sri Ram	9944268422		PG Building	6.5 Cr",
  "202	Saie Chandradekhar	9535155166		PG Building	6.5 Cr",
  "203	Xerox	6363668263		Rental Income Building	80L",
  "204	Shankar	9886031438		Rental Income Building	6 Cr",
  "205	Anu	9632469463		Office Space	",
  "206	Yashas Anand	81975 68541		PG Building	6.5 Cr",
  "207	Ravi	61 415 719 950		PG Building	6.5 Cr",
  "208	Karthik	98801 15983		PG Building	6.5 Cr",
  "209	Sunil reddy	9996668033		PG Building	5 to 6 Cr",
  "210	Sandeep	94800 08899		PG Building	6.5 Cr",
  "211	Dhruv	9845707084		Office Space	",
  "212	Swaroop	1 (216) 820-5185		Commercial Building	5 Cr",
  "213	tpvirse	79048 77463		Commercial Building	6 to 8cr",
  "214	Kiran Srinivasa	98808 29361		PG Building	6.5 Cr",
  "215	Siva old owner	90353 10825		Rental Income Building	",
  "216	Nikhila	88847 93711		PG Building	5 to 6 Cr",
  "217	Kartik Parasher	75056 83996		PG Building	6 Cr",
  "218	-	81475 81201		Rental Income Building	1.5 Cr",
  "219	Annapurna Borra	7411 661 666		PG Building	6.5 Cr",
  "220	Padarthi	95813 44443		Commercial Plot	6.5 Cr",
  "221	SR	96633 68933		Commercial Building	10 to 20 Cr",
  "222	Pavan	99168 62299		Rental Income Building	3.5 Cr",
  "223	Nutrition Nation	98454 17510		Rental Income Building	2 to 2.4 Cr",
  "224	Saket Agarwal	98440 41853		Commercial Building	7 to 8 Cr",
  "225	Abdul Rawoof	94405 82959		PG Building	6.5 Cr",
  "226	Chunduru Harikumar	99484 28781		PG Building	6.5 Cr",
  "227	SUNIL MANAWAT	98440 05512		PG Building	7 Cr",
  "228	Arjun	83747 71715		PG Building	6.5 Cr",
  "229	Shree Prashasta N	821 782 4483		PG Building	6.5 Cr",
  "230	Sharad Kiyal	90515 33717		PG Building	6.5 Cr",
  "231	Sreeram Purushotham	92991 55551		PG Building	2 Cr",
  "232	Ahmed Zakee	9900314444		Commercial Building	31 Cr",
  "233	Balu	8147581201		Plot	1.5 Cr",
  "234	Sunil	99966 68033		Residential Plot	",
  "235	Ashok Shetty	91083 43107		Commercial Building	15 Cr to 20 Cr",
  "236	Pankaj Soni	87595 39440		PG Building	6.5 Cr",
  "237	Sreeram Purushotham	92991 55551		Rental Income Building	1.5 to 2cr",
  "238	Kiran Srinivasa	98808 29361		PG Building	5 to 6cr",
  "239	Arjun	7760295811		Commercial Building	5 to 9 Cr more",
  "240	Naveen	9606656849		PG Building	6.5 Cr",
  "241	Abhi	95919 36333		Rental Income Building	2.5 Cr",
  "242	Ruzzain	63629 81231		Commercial Building	5 to 6cr",
  "243	K Karthik	8971846698		PG Building	6.5 Cr",
  "244	James Anthony	9343047196		PG Building	4.10Cr",
  "245	Vaibhav Raj Pathi	64220170033		Commercial Building	20cr aand 1.5cr",
  "246	Nagendra	94801 01386		PG Building	6.5cr",
  "247	Pavan K	8978946984		PG Building	3 Cr",
  "248	Daivik Raju	8880022322		PG Building	6.5 Cr",
  "249	Om	97419 77117		Commercial Building	3 to 4 Cr",
  "250	Somya	9536769000		PG Building	13 Cr",
  "251	Daivik Raju	88800 22322		PG Building	8 Cr",
  "252	Rakshitha	99808 23601		Commercial Building	3.5 Cr",
  "253	Dhruv Yadav	8319937871		Agricalture Land	need 500 acrs",
  "254	Sandhya	9008810469		PG Building	8 Cr",
  "255	Ashwini Selvam	77299 62699		Plot	",
  "256	Shashikant	98204 49530		Plot	2-3ksqft",
  "257	Naveen	93530 51267		PG For Lease	",
  "258	Vinutha	72071 44022		Rental Income Building	1.5Cr",
  "259	Shashank Reddy	9620742028		PG Building	6.5Cr",
  "260	Rasheed	971 50 764 8903		Commercial Building	",
  "261	Santhosh	1 (425) 324-1062		PG Building	2.60cr PG Start",
  "262	Raja Ramesh J	6591296665		Rental Income Building	2 Cr",
  "263	Mallesh.V	9440047743		Rental Income Building	6 Cr",
  "264	9515770171	9515770171		PG Building	5 Cr",
  "265	Murali	9844319514		PG Building	6cr",
  "266	Shahank Reddy	96207 42028		PG Building	7CR Below",
  "267	Suhail	91826 14211		PG Building	3cr",
  "268	adi krishna	99455 06115		Rental Income Building	3.5cr",
  "269	Chanti	1 (530) 370-9040		PG Building	6 to 8cr",
];

function normalizePhone(phone) {
  if (!phone || phone === '—') return '';
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // If starts with 1 and has more than 10 digits, remove leading 1 (country code)
  if (cleaned.startsWith('1') && cleaned.length > 10) {
    cleaned = cleaned.slice(1);
  }
  // If starts with +, remove it
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  // Take last 10 digits
  const digits = cleaned.replace(/\D/g, '');
  return digits.slice(-10);
}

function parseBudget(str) {
  if (!str || str === '—' || str.trim() === '') return { label: '', val: 0 };
  const s = str.trim().toLowerCase();
  let num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return { label: str.trim(), val: 0 };
  if (s.includes('lakh') || s.includes('lac')) return { label: str.trim(), val: num / 100 };
  if (s.includes('cr') || s.includes('crore')) return { label: str.trim(), val: num };
  return { label: str.trim(), val: num };
}

// Parse all rows
const parsed = raw.map((line, i) => {
  const parts = line.split('\t');
  const sno = parseInt(parts[0], 10);
  const name = (parts[1] || '').trim();
  const phone = (parts[2] || '').trim();
  const type = (parts[3] || (parts.length > 4 ? parts[4] : '') || '').trim();
  const budgetStr = (parts.length > 4 ? parts[parts.length - 1] || '' : '').trim();

  const budget = parseBudget(budgetStr);

  return { sno, name, phone, type, budget: budget.label, budget_val: budget.val };
});

// Filter out invalid entries
const valid = parsed.filter(
  (p) => p.phone && p.phone !== '—' && p.phone.length >= 6 && p.name && p.name !== '—' && p.name !== '-',
);

console.log(`Parsed ${valid.length} valid leads`);

// Dedup by normalized phone
const seen = new Map();
const deduped = [];
for (const p of valid) {
  const key = normalizePhone(p.phone);
  if (!key) continue;
  if (seen.has(key)) {
    console.log(`  Duplicate: "${p.name}" (${p.phone}) matches existing "${seen.get(key).name}" (${seen.get(key).phone})`);
    continue;
  }
  seen.set(key, p);
  deduped.push(p);
}

console.log(`After dedup: ${deduped.length} unique leads`);

// Assign new sequential sno
const clients = deduped.map((p, i) => ({
  sno: (i + 1),
  name: p.name,
  phone: p.phone,
  email: '',
  type: p.type || '—',
  budget: p.budget || '—',
  budget_val: p.budget_val || 0,
  location: '',
  closed_price: '',
  closing_timeline: '',
  requirements: '',
  status: 'New Lead',
  date: null,
  notes: '',
  buyer_comm_pct: '',
  buyer_comm_val: '',
  seller_comm_pct: '',
  seller_comm_val: '',
  total_comm: '',
  comm_status: '',
  my_share: '',
  source: '',
  updated_date: '',
}));

// Delete all existing rows and insert fresh
const { error: delErr } = await supabase.from('crm_clients').delete().neq('id', 0);
if (delErr) {
  console.error('Delete failed:', delErr.message);
  process.exit(1);
}
console.log('Cleared existing data');

// Insert in batches of 50
const batchSize = 50;
for (let i = 0; i < clients.length; i += batchSize) {
  const batch = clients.slice(i, i + batchSize);
  const { error: insErr } = await supabase.from('crm_clients').insert(batch);
  if (insErr) {
    console.error(`Insert batch ${i / batchSize} failed:`, insErr.message);
    process.exit(1);
  }
  console.log(`Inserted ${i + batch.length}/${clients.length}`);
}

console.log(`Done! ${clients.length} leads imported.`);
