
const Quotes = [
  "Love is the language of the heart.",
  "True love grows stronger with time.",
  "Love brings peace to a restless soul.",
  "A caring heart is the beginning of love.",
  "Love is built on trust and respect.",
  "Small acts of kindness make love beautiful.",
  "Love means accepting imperfections.",
  "Distance cannot weaken genuine love.",
  "Love gives strength during difficult times.",
  "A smile shared with love is priceless.",
  "Love is about giving without expecting.",
  "Love creates unforgettable memories.",
  "Patience and understanding deepen love.",
  "Real love stands by you in every season.",
  "Love turns ordinary moments into special ones.",
  "Forgiveness is a powerful part of love.",
  "Love inspires us to become better people.",
  "A loyal heart is love's greatest gift.",
  "True love never fades; it only grows stronger.",
  "Love makes life more meaningful."
];

const h2=document.querySelector("h2");
const button=document.querySelector("button");

button.addEventListener('click',()=>{
    const index=Math.floor(Math.random()*20);

    h2.textContent=Quotes[index];
})

