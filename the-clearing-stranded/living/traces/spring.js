// The Hidden Spring (spring), traced to its painting (art/places/09-hidden-spring.webp, 1536 x 1024). Every number is in
// painting pixels.
// stand: things that stand up out of the ground. base is the painting y where each meets the ground ('col': each
//   column's lowest point, for woods, bushes and the ledge); anything whose feet are north of the base goes behind it.
//   deep: how far back a big rock goes; its depth is taken at its middle, so things set on top of it show in front of it.
// ground: kinds of ground over the grass: k the spring pool (no walking in it).
// trails: [width, points...], always walkable. spots: where the game's things are used. exits: where a trail leaves.
window.TRACES = window.TRACES || {};
window.TRACES.spring = {
  id: 'spring', painting: '09-hidden-spring', size: [1536, 1024], ground0: 'g',
  stand: [
    // the brush along the top, over the ledge
    {id: 'brushN', kind: 'woods', base: 'col', pts: [[420, 0], [1536, 0], [1536, 430], [1490, 430], [1490, 300], [1400, 250], [1300, 236], [1240, 140], [1200, 90], [1150, 80], [1110, 160], [1000, 176], [900, 150], [800, 120], [700, 150], [620, 110], [520, 100], [440, 100]]},
    // the sandstone ledge across the top; the water trickles off it into the pool
    {id: 'ledge', kind: 'ledge', base: 'col', pts: [[440, 100], [520, 100], [620, 110], [700, 150], [800, 120], [900, 150], [1000, 176], [1110, 160], [1150, 80], [1200, 90], [1240, 140], [1300, 236], [1400, 250], [1490, 300],
      [1490, 430], [1400, 424], [1300, 414], [1240, 396], [1180, 350], [1100, 318], [1000, 306], [950, 300], [900, 300], [860, 300], [760, 290], [680, 270], [600, 240], [520, 234], [460, 234]]},
    // ferns and moss in the shade under the ledge, round the back of the pool
    {id: 'fernsN', kind: 'brush', base: 'col', pts: [[560, 236], [680, 270], [760, 290], [900, 300], [1000, 306], [1100, 318], [1180, 350], [1240, 396], [1250, 436], [1200, 450], [1140, 466], [1100, 462], [1050, 450], [1015, 440], [985, 420], [944, 402], [894, 396], [850, 400], [780, 406], [720, 404], [660, 392], [600, 384], [570, 340]]},
    // the big tree at the top left and the thick brush down the left side
    {id: 'treeNW', kind: 'tree', base: 392, pts: [[0, 0], [420, 0], [440, 100], [420, 200], [340, 260], [250, 300], [240, 392], [150, 392], [150, 330], [60, 300], [0, 300]]},
    {id: 'brushW1', kind: 'woods', base: 'col', pts: [[0, 300], [60, 300], [150, 330], [150, 392], [240, 392], [250, 300], [340, 260], [420, 200], [440, 100], [460, 234], [520, 234], [560, 236], [570, 340], [600, 384], [560, 390], [500, 380], [470, 392], [466, 440], [456, 500], [0, 500]]},
    {id: 'brushW2', kind: 'woods', base: 'col', pts: [[0, 500], [456, 500], [440, 560], [404, 600], [392, 640], [384, 660], [340, 690], [300, 700], [0, 700]]},
    {id: 'brushW3', kind: 'woods', base: 'col', pts: [[0, 700], [300, 700], [310, 740], [256, 750], [250, 820], [0, 820]]},
    {id: 'brushW4', kind: 'woods', base: 'col', pts: [[0, 820], [250, 820], [300, 840], [310, 920], [300, 1024], [0, 1024]]},
    {id: 'rockW', kind: 'rock', base: 612, deep: 50, pts: [[280, 580], [300, 556], [350, 550], [384, 566], [386, 600], [370, 614], [290, 614]]},
    {id: 'bushW', kind: 'woods', base: 'col', pts: [[416, 680], [440, 660], [480, 664], [500, 700], [496, 760], [440, 768], [416, 740]]},
    // mossy rocks round the pool's west and east sides
    {id: 'mossW', kind: 'rock', base: 504, deep: 40, pts: [[664, 456], [690, 420], [740, 408], [776, 418], [770, 452], [740, 476], [730, 504], [680, 504], [662, 486]]},
    {id: 'mossE', kind: 'rock', base: 510, deep: 30, pts: [[1024, 476], [1050, 464], [1100, 466], [1120, 488], [1110, 510], [1030, 510]]},
    // the meadow's bushes and rocks, and the brush along the bottom (round the big tree's trunk)
    {id: 'bushC', kind: 'woods', base: 'col', pts: [[762, 700], [800, 678], [860, 680], [894, 710], [892, 760], [850, 782], [790, 782], [762, 756]]},
    {id: 'rockC', kind: 'rock', base: 774, deep: 24, pts: [[892, 750], [910, 738], [950, 740], [962, 760], [950, 774], [900, 774]]},
    {id: 'bushE', kind: 'woods', base: 'col', pts: [[1030, 600], [1080, 580], [1150, 582], [1204, 600], [1210, 700], [1204, 802], [1100, 806], [1030, 826], [968, 820], [960, 740], [1000, 700], [1024, 660]]},
    {id: 'bushS', kind: 'woods', base: 'col', pts: [[830, 790], [880, 780], [930, 786], [970, 800], [986, 830], [978, 870], [940, 880], [900, 876], [860, 876], [830, 860]]},
    {id: 'rockSE', kind: 'rock', base: 894, deep: 60, pts: [[980, 830], [1010, 806], [1100, 800], [1180, 806], [1196, 840], [1190, 880], [1150, 894], [1000, 894], [978, 868]]},
    {id: 'rockS', kind: 'rock', base: 946, deep: 40, pts: [[796, 900], [812, 876], [870, 868], [906, 880], [910, 920], [890, 946], [810, 946]]},
    {id: 'brushS', kind: 'woods', base: 'col', pts: [[600, 1024], [610, 960], [650, 900], [700, 860], [770, 852], [800, 900], [810, 946], [890, 946], [910, 900], [940, 880], [978, 870], [1000, 894], [1150, 894], [1210, 894], [1290, 900], [1370, 900], [1372, 972], [1428, 972], [1440, 900], [1536, 900], [1536, 1024]]},
    // the big tree at the bottom right
    {id: 'treeSE', kind: 'tree', base: 972, pts: [[1210, 600], [1244, 470], [1250, 416], [1400, 424], [1490, 430], [1536, 430], [1536, 900], [1440, 900], [1428, 972], [1372, 972], [1370, 900], [1290, 900], [1180, 896], [1186, 840], [1204, 802]]}
  ],
  ground: [
    // the spring pool under the trickle
    ['k', [[780, 412], [850, 404], [894, 400], [944, 404], [985, 424], [1015, 444], [1030, 474], [1010, 504], [990, 520], [940, 528], [915, 545], [870, 556], [810, 556], [770, 545], [752, 520], [756, 480], [766, 446]]]
  ],
  trails: [
    // south to the Oak Woods: up from the bottom edge through the meadow to the pool's west side
    [40, [500, 1024], [505, 960], [515, 900], [540, 850], [566, 810], [600, 772], [636, 744], [684, 708], [722, 670], [730, 636], [716, 600], [690, 570], [660, 544], [636, 516], [616, 488]]
  ],
  hub: [716, 600],
  exits: [['oak', 500, 1024]],
  // the game's spot: the gravelly south edge of the pool, where you kneel to drink
  spots: {pool: [[862, 574]]}
};
