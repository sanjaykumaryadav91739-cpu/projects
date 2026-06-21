const Quotes = [
   "NUJHAT PARWEEN, regNo: 24151130001",
   "RAJEEV KUMAR SINGH, regNo: 24151130002",
    "SHALU KUMARI, regNo: 24151130003" ,
    "NITISH KUMAR, regNo: 24151130004" ,
    "RANJAN KUMAR, regNo: 24151130005" ,
    "SUKRITI RIYA, regNo: 24151130006" ,
    "SANJU KUMARI, regNo: 24151130007" ,
    "SWATI KUMARI, regNo: 24151130008" ,
    "AVINASH KUMAR, regNo: 24151130009",
    "JUGESH KUMAR, regNo: 24151130010" ,
    "DEEPA KUMARI, regNo: 24151130011" ,
    "NEHA KUMARI, regNo: 24151130012" ,
    "GOURAV KUMAR, regNo: 24151130013",
    "BHAWANA KUMARI, regNo:24151130014" ,
    "ARMAN KUMAR, regNo: 24151130015" ,
    "SUMIT RANJAN, regNo: 24151130016" ,
    "TANYA KUMARI, regNo: 24151130017" ,
    "BISHWAJIT KUMAR, regNo: 24151130018" ,
    "SACHIN KUMAR, regNo: 24151130019" ,
    "PUJA KUMARI, regNo: 24151130020" ,
    "RITESH KUMAR, regNo: 24151130021" ,
    "SAKSHI KUMARI, regNo: 24151130022" ,
    "ANKIT NATH THAKUR, regNo: 24151130023" ,
    "SURBHI BHARTI, regNo: 24151130024" ,
    "ANKIT KUMAR, regNo: 24151130025" ,
    "DIVYANSHU KUMAR, regNo: 24151130026" ,
    "NITISH KUMAR, regNo: 24151130027" ,
    "ATUL RAJ, regNo: 24151130028" ,
    "PRAGATI KUMARI, regNo: 24151130029",
    "AKANKSHA KUMARI, regNo: 24151130030" ,
    "SHRUTI KUMARI, regNo: 24151130031",
    "PRINCE KUMAR, regNo: 24151130032"        ,
    "PRIYANSHU KUMAR, regNo:24151130033"      ,
    "ROHIT KUMAR, regNo: 24151130034"         ,
    "SHASHI KUMAR YADAV, regNo: 24151130035"  ,
    "ABHISHEK KUMAR, regNo: 24151130036"      ,
    "ABHINAV KUMAR, regNo: 24151130037"       ,
    "SUMIT KUMAR, regNo: 24151130038"         ,
    "ANKIT KUMAR, regNo: 24151130039"         ,
    "AMUL KUMAR, regNo: 24151130040"          ,
    "RAJ GAURAV, regNo: 24151130041"          ,
    "SANJAY KUMAR YADAV, regNo: 24151130042"  ,
    "TAMANNA ARYA, regNo: 24151130043"        ,
    "SUBHASH KUMAR YADAV, regNo: 24151130044" ,
    "AARYA SUMANT, regNo: 24151130045" ,
    "SATYAM SINGH, regNo: 24151130046" ,
    "KUMAR SATYAM, regNo: 24151130047" ,
    "AKSHAY KUMAR, regNo: 24151130048" ,
    "AYUSH KUMAR, regNo: 24151130049"  ,
    "GOVINDA KUMAR, regNo: 24151130050",
    "SHUBHAM RAJ, regNo: 24151130051"  ,
    "MANISH KUMAR, regNo: 24151130052" ,
    "ARTI KUMARI, regNo: 24151130053"  ,
    "NITU KUMARI,  regNo: 24151130054" ,
    "RISHABH RAJ, regNo: 24151130055" , 
    "ABHISHEK KUMAR, regNo: 24151130056"        ,
    "DEV KUMAR SHARMA, regNo: 24151130057"      ,
    "ABHISHEK KUMAR, regNo: 25151130901"        ,
    "PRIYA BHARTI, regNo: 25151130902"          ,
    "SANDEEP KUMAR VERMA, regNo: 25151130903"   ,
    "ANKIT KUMAR, regNo: 25151130904"           ,
    "AMAN KUMAR, regNo: 25151130905"            ,
    "PRIYE RANJAN, regNo: 25151130906"          ,
    "RAHUL KUMAR CHAUDHARY, regNo: 25151130907" ,
    "SURAJ KUMAR, regNo: 25151130908"           ,
    "PRIYADARSHI KUMARI, regNo: 25151130909"    ,
    "SIMRAN SINGH, regNo: 25151130910"          ,
    "VISHAL KUMAR, regNo: 23151130016"          ,
    "SUNDRAM KUMAR, regNo: 23151130044"         
];



const h2 = document.querySelector("h2");
const button = document.querySelector("button");

let usedIndexes = [];

function getRandomQuote() {
    if (usedIndexes.length === Quotes.length) {
        usedIndexes = [];
        alert("Sabhi students ek baar show ho chuke hain. Restart ho raha hai!");
    }

    let index;

    do {
        index = Math.floor(Math.random() * Quotes.length);
    } while (usedIndexes.includes(index));

    usedIndexes.push(index);

    return Quotes[index];
}

button.addEventListener("click", () => {
    h2.textContent = getRandomQuote();

   // button.style.backgroundColor='pink';
   const colors = ["red", "green", "blue", "orange", "purple","yellow"];
    const index = Math.floor(Math.random() * colors.length);

    button.style.backgroundColor = colors[index];
});


