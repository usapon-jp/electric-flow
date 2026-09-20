export const stages = [
  {name:'はじめての回路',section:0,title:'つながると、灯る。',intro:'端子を2つタップして、ひとつながりに。',hint:'電池・電球・スイッチを、輪になるようにつなぎます。',insight:'ひとつながりになると、電流が流れる。'},
  {name:'電流の道',section:0,title:'光の通り道を、見てみよう。',intro:'スイッチを開くと、どうなる？',hint:'切れ目があると、回路全体の電流が止まります。',insight:'電流は、外側の回路を＋から−へ。'},
  {name:'電流をはかる',section:1,title:'電球の前と、後では？',intro:'導線の途中をタップして、電流計を入れる。',hint:'電流計は、導線を切ったところへ直列につなぎます。',insight:'電流は、電球を通っても減らない。'},
  {name:'電圧をはかる',section:1,title:'ふたつの点の、あいだ。',intro:'はかりたい2つの端子をタップ。',hint:'電圧計は、はかりたい部分の両端へ。',insight:'電流は途中で。電圧は両端で。'},
  {name:'直列と並列',section:2,title:'もうひとつ、灯りを。',intro:'つなぎ方を変えて、明るさをくらべる。',hint:'並列では、一方の枝が切れても、もう一方に道が残ります。',insight:'一つの道が直列。枝分かれする道が並列。'},
  {name:'枝分かれの規則',section:2,title:'分かれた流れは、どこへ。',intro:'3か所をはかって、数値をくらべる。',hint:'並列の枝の電流を足すと、全体の電流になります。',insight:'直列：電流は同じ、電圧は和。並列：電圧は同じ、電流は和。'},
  {name:'電圧と電流',section:2,title:'少しずつ変えると、見えてくる。',intro:'抵抗器で、1・2・3 Vの電流を記録する。',hint:'抵抗は変えずに、電圧だけを変えてくらべます。',insight:'抵抗が一定なら、電流は電圧に比例する。'},
  {name:'抵抗とオームの法則',section:2,title:'流れにくさを、はかろう。',intro:'同じ電圧で、抵抗を入れ替える。',hint:'同じ電圧なら、電流が小さいほど抵抗は大きくなります。',insight:'抵抗 R＝電圧 V ÷ 電流 I。これが、オームの法則。'},
  {name:'実験から、問題へ',section:3,title:'さっきの実験を、読み解く。',intro:'回路・表・グラフを手がかりに。',hint:'表の一組の電圧と電流から、V÷Iを考えます。',insight:'触った回路が、図になり、答えにつながる。'},
];
export const initialStage = stage => ({
  stage, schematic:stage===8, topology:stage===4?'series':stage===5?'parallel':'single',
  voltage:stage>=6?1:stage===5?3:1.5, resistance:stage>=6?10:7.5,
  wires:stage===0?[]:[['p','a'],['b','sr'],['sl','n']], closed:stage!==0,
  removed:false, selected:null, probes:[], tool:stage===3?'voltage':stage===2||stage===5?'current':null,
  meter:null, range:null, records:{}, seen:[], answers:{}, samples:[], question:0, feedback:'', hint:false,
  prediction:null, graphGuess:null, confirmed:false, examConnections:[], examPoints:[], tour:0, answerShown:false,
});
export const examQuestions = [
 {title:'抵抗器の電圧をはかるには？',kind:'connection',note:'電圧計をつなぐ2点を選ぶ。'},
 {title:'3.0 Vの測定点は、どこ？',kind:'plot',note:'表を見て、グラフの点を選ぶ。'},
 {title:'この抵抗器の抵抗は？',kind:'number',unit:'Ω',answer:10,note:'電圧と電流を一組使う。'},
 {title:'4.0 Vでは、何A流れる？',kind:'number',unit:'A',answer:.4,note:'未測定の値を、予想する。'},
 {title:'変えずにおく条件は？',kind:'choice',choices:['抵抗器','電圧','電流'],answer:'抵抗器',note:'電圧と電流の関係を調べるとき。'},
];
