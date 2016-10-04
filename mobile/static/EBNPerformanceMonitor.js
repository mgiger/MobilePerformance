
class Point
{
	constructor(x, y)
	{
		this.x = x;
		this.y = y;
	}
	
	overlaps(other)
	{
		return this.y >= other.x && other.y >= this.x
	}
};

class Rect
{
	constructor(x, y, width, height)
	{
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
};

class EBNSystemStats
{
	constructor(systemData)
	{
		this.timeMarks = [];
		this.frameRate = [];
		this.mainThreadLoad = [];
		this.backgroundThreadLoad = [];
		this.residentMemory = [];
		this.residentMemoryPeak = [];

		for(var i=0;i<systemData.length;++i)
		{
			var obj = systemData[i];
			this.timeMarks.push(Math.floor(obj["timestamp"]));
			this.frameRate.push(obj["fps"]);
			this.mainThreadLoad.push(obj["mainThreadUsage"]);
			this.backgroundThreadLoad.push(obj["backgroundThreadUsage"]);
			this.residentMemory.push(obj["residentMemory"]);
			this.residentMemoryPeak.push(obj["residentMemoryPeak"]);
		}
	}
}


class EBNBlockArray
{
	constructor(name)
	{
		this.name = name;
		this.blocks = [];
		this.colors = [];
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
	}
	
	addBlock(xrange, color)
	{
		if(this.xRange.x > xrange.x)	this.xRange.x = xrange.x;
		if(this.xRange.y < xrange.y)	this.xRange.y = xrange.y;
		
		this.blocks.push(xrange);
		this.colors.push(color);
	}
	
	overlaps(otherBlock)
	{
		return this.xRange.overlaps(otherBlock.xRange);
	}
	
	draw(ctx, chart, ypos, yheight)
	{
		var x0 = 0;
		for(var i=0;i<this.blocks.length;++i)
		{
			var coord0 = chart.dataToCoord(this.blocks[i].x, 0);
			var coord1 = chart.dataToCoord(this.blocks[i].y, 1);
			if(i == 0)
			{
				x0 = coord0.x;
			}
			
			ctx.lineWidth = 1;
			ctx.fillStyle = this.colors[i];
			ctx.fillRect(coord0.x, ypos, (coord1.x - coord0.x), yheight);

			ctx.strokeStyle = "#000";
			ctx.strokeRect(coord0.x, ypos, (coord1.x - coord0.x), yheight);
		}	

		// ID
		if(chart.labels)
		{
			ctx.fillStyle = "#000";
			ctx.fillText(this.name, x0 + 20, ypos + 30);
		}
	}
}

class EBNGenericStats
{
	constructor(genericData)
	{
		this.colors = [	"#E5BDFF", "#E8E8E8", "#FF8F8C", "#E8A487", "#FFD194",
						"#B25350", "#3EB267", "#994117", "#8CFFB4", "#5B9ACC",
						"#FCFFA5", "#A452CC", "#9AFFCD", "#B28F48", "#7F9926"];

		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		
		this.blockArrays = [];
		for(var i=0;i<genericData.length;++i)
		{
			var obj = genericData[i];
			var evts = obj["events"];
			
			if(evts.length > 0)
			{
				var block = new EBNBlockArray(obj["id"]);
				for(var j=1;j<evts.length;++j)
				{
					block.addBlock(new Point(evts[j-1], evts[j]), this.colors[j % this.colors.length]);
				}
				this.blockArrays.push(block);
				
				// calculate our range
				if(this.xRange.x > evts[0])				this.xRange.x = evts[0];
				if(this.xRange.y < evts[evts.length-1])	this.xRange.x = evts[evts.length-1];
			}
		}
	}
}

class EBNNetworkStats
{
	constructor(networkData)
	{
		this.timeMarks = [];
		this.networkData = [];
		this.networkLoad = [];
		var lastLoadValue = 0;
		
		this.blockArrays = [];
		
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		for(var i=0;i<networkData.length;++i)
		{
			var obj = networkData[i];
			var req = obj["request"];
			var res = obj["response"];
			var timecount = Math.floor(obj["timestamp"]);
			var data = {
				"name":obj["comment"],
				"time":obj["time"],
				"timings":obj["timings"],
			}
			
			this.timeMarks.push(timecount);
			this.networkData.push(data);

			lastLoadValue += (req["bodySize"]+req["headersSize"]+res["bodySize"]+res["headersSize"]) / (1024*1024);
			this.networkLoad.push(lastLoadValue);
			
			var timings = obj["timings"];
			var blocked = timings["blocked"];
			var connect = timings["connect"];
			var send = timings["send"];
			var wait = timings["wait"]
			var receive = timings["receive"];
			var processTime = timings["processTime"];
			
			var btime = timecount;
			var block = new EBNBlockArray(obj["comment"]);
			block.addBlock(new Point(btime, btime + blocked), "#E82C0C");
			btime += blocked;
			block.addBlock(new Point(btime, btime + connect), "#E82C0C");
			btime += connect;
			block.addBlock(new Point(btime, btime + send), "#9FE8AB");
			btime += send;
			block.addBlock(new Point(btime, btime + wait), "#9FE8AB");
			btime += wait;
			block.addBlock(new Point(btime, btime + receive), "#9FE8AB");
			btime += receive;
			block.addBlock(new Point(btime, btime + processTime), "#AA50FF");
			btime += processTime;
			this.blockArrays.push(block);
			
			
			this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);

			// calculate our range
			if(this.xRange.x > timecount)	this.xRange.x = timecount;
			if(this.xRange.y < btime)		this.xRange.x = btime;
		}
	}
}

class EBNPageStats
{
	constructor(pageData)
	{
		this.timeMarks = [];
		this.pageData = [];
		for(var i=0;i<pageData.length;++i)
		{
			var obj = pageData[i];
			var data = {
				"name":obj["id"],
				"time":obj["pageTimings"]["onLoad"]
			}
			this.timeMarks.push(Math.floor(obj["timestamp"]));
			this.pageData.push(data);
		}
	}
}

class EBNPerformanceMetrics
{
	constructor(jsonData)
	{
		var log = jsonData["log"];
			
		this.appVersion = log["creator"] + " " + log["version"];

		this.sessionStats = log["session"];
		this.hardwareStats = log["hardware"];

		this.firstTimestamp = this.sessionStats["coldLaunch"];
		if(!this.firstTimestamp)
			this.firstTimestamp = this.sessionStats["warmLaunch"];
		this.lastTimestamp = this.sessionStats["resignActive"];
		this.timeRange = [0, this.lastTimestamp - this.firstTimestamp];
		
		
		this.systemStats = new EBNSystemStats(log["system"]);
		this.networkStats = new EBNNetworkStats(log["entries"]);
		this.pageStats = new EBNPageStats(log["pages"]);
		this.genericStats = new EBNGenericStats(log["generic"]);
	}
	
	deviceName()
	{
		return IOS_DEVICES[this.hardwareStats["deviceType"]];
	}
	
};



class Axes
{
	constructor()
	{
		this.tickCount = 1;
	}
	
	resize(chart)
	{
		this.tickCount = new Point(1, 1);
		var xlen = Math.floor(chart.xRange.y - chart.xRange.x);
		while(xlen / this.tickCount.x > 10)
		{
			if(this.tickCount.x < 10)			this.tickCount.x += 1;
			else if(this.tickCount.x < 100)		this.tickCount.x += 10;
			else if(this.tickCount.x < 500)		this.tickCount.x += 100;
			else if(this.tickCount.x < 1000)	this.tickCount.x += 500;
			else if(this.tickCount.x < 10000)	this.tickCount.x += 1000;
			else								this.tickCount.x += 10000;
		}
		
		var ylen = Math.floor(chart.yRange.y - chart.yRange.x);
		while(ylen / this.tickCount.y > 10)
		{
			if(this.tickCount.y < 10)			this.tickCount.y += 1;
			else if(this.tickCount.y < 100)		this.tickCount.y += 10;
			else if(this.tickCount.y < 500)		this.tickCount.y += 100;
			else if(this.tickCount.y < 1000)	this.tickCount.y += 500;
			else if(this.tickCount.y < 10000)	this.tickCount.y += 1000;
			else								this.tickCount.y += 10000;
		}
	}
	
	draw(ctx, chart)
	{
		ctx.font = "16px serif";
		
		ctx.lineWidth = 0.2;
		var frame = chart.viewFrame;
		for(var i=chart.xRange.x; i<chart.xRange.y; i += this.tickCount.x)
		{
			var coord = chart.dataToCoord(i, 0);
			ctx.beginPath();
			ctx.moveTo(coord.x, frame.y);
			ctx.lineTo(coord.x, frame.y + frame.height);
			ctx.stroke();
			
			var val = Math.floor(i - chart.xRange.x);
			var tsize = ctx.measureText(val);
			ctx.fillText(val, coord.x - tsize.width/2, frame.y + frame.height + 16);
		}
		
		for(var i=chart.yRange.x; i<chart.yRange.y; i += this.tickCount.y)
		{
			var coord = chart.dataToCoord(0, i);
			ctx.beginPath();
			ctx.moveTo(frame.x, coord.y);
			ctx.lineTo(frame.x + frame.width, coord.y);
			ctx.stroke();
			
			var val = Math.floor(i - chart.yRange.x);
			var tsize = ctx.measureText(val);
			ctx.fillText(val, frame.x + frame.width + 2, coord.y);
		}
	}
};

class DatasetView
{
	constructor(timeArray, dataArray, options)
	{
		this.timeArray = timeArray;
		this.dataArray = dataArray;
		this.options = options;
		this.drawScale = new Point(1, 1);
		this.viewFrame = new Rect(10, 10, 0, 0);
		this.calculateRanges();
	}
	
	setChart(chart)
	{
		this.chart = chart;
		this.ctx = chart.context;
	}

	calculateRanges()
	{
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		for(var i=0;i<this.timeArray.length;++i)
		{
			var x = this.timeArray[i];
			if(this.xRange.x > x)	this.xRange.x = x;
			if(this.xRange.y < x)	this.xRange.y = x;
		}
		
		this.yRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		for(var i=0;i<this.dataArray.length;++i)
		{
			var y = this.dataArray[i];
			if(this.yRange.x > y)	this.yRange.x = y;
			if(this.yRange.y < y)	this.yRange.y = y;
		}
	}
	
	dataToCoord(x, y)
	{
		return new Point(	this.viewFrame.x + (x - this.xRange.x) * this.drawScale.x,
							this.viewFrame.height + this.viewFrame.y - ((y - this.yRange.x) * this.drawScale.y));
	}
	
	resize(frame)
	{
		this.viewFrame = frame;
		this.drawScale = new Point(	frame.width / (this.xRange.y - this.xRange.x),
									frame.height / (this.yRange.y - this.yRange.x));
	}
	
	draw(ctx)
	{
	}
}

class DatasetLineView extends DatasetView
{
	constructor(timeArray, dataArray, options)
	{
		super(timeArray, dataArray, options);
	}
	
	draw(ctx)
	{
		super.draw(ctx);

		// draw the data as a line
		ctx.beginPath();
		for(var i=0;i<this.timeArray.length;++i)
		{
			var coord = this.chart.dataToCoord(this.timeArray[i], this.dataArray[i]);
			if(i == 0)
			{
				ctx.moveTo(coord.x, coord.y);
			}
			else
			{
				ctx.lineTo(coord.x, coord.y);
			}
			
		}
		
		ctx.strokeStyle = (this.options.color == undefined) ? '#F00' : this.options.color;
		ctx.lineWidth = 2;
		ctx.shadowColor = '#999';
		ctx.shadowBlur = 4;
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		
		
		if(this.options.fillColor != undefined)
		{
			ctx.stroke();
		
			ctx.lineTo(coord.x, this.viewFrame.y + this.viewFrame.height);
			ctx.lineTo(this.viewFrame.x, this.viewFrame.y + this.viewFrame.height);
			
			ctx.closePath();
			ctx.fillStyle=this.options.fillColor;
			ctx.fill();
		}
		else
		{
			ctx.stroke();
		}
		
	}
};

class DatasetBlockView extends DatasetView
{
	constructor(genericBlocks, options)
	{
		super(genericBlocks, null);
		this.genericBlocks = genericBlocks;
		this.xRange = this.genericBlocks.xRange;
		this.yRange = new Point(0, 1);
		
		this.labels = true;
		this.blockTop = 20;
		this.blockHeight = 40;
		this.blockStagger = 2;
		
		if(options != undefined)
		{
			if(options["labels"] != undefined)			this.labels = options["labels"];
			if(options["blockTop"] != undefined)		this.blockTop = options["blockTop"];
			if(options["blockHeight"] != undefined)		this.blockHeight = options["blockHeight"];
			if(options["blockStagger"] != undefined)	this.blockStagger = options["blockStagger"];
		}
	}
	
	calculateRanges()
	{
	}
	
	draw(ctx, chart)
	{
		super.draw(ctx);
		
		ctx.font = "16px serif";
	
		var ypos = this.viewFrame.y + this.blockTop;
		var blocks = this.genericBlocks.blockArrays;
		for(var i=0;i<blocks.length;++i)
		{
			if(i % this.blockStagger == 0)
				ypos = this.viewFrame.y + this.blockTop;
			else
				ypos += this.blockHeight;
				
			blocks[i].draw(ctx, this.chart, ypos, this.blockHeight);
		}
	}
}

class EBNChart
{
	constructor(containerId)
	{
		this.canvas = document.createElement("canvas");
		this.container = document.getElementById(containerId);
		this.container.appendChild(this.canvas);
		// this.canvas.style.direction = "ltr";
		// this.canvas.style.position = "absolute";
		// this.canvas.style.left = 0;
		// this.canvas.style.top = 0;
		this.context = this.canvas.getContext("2d");
		this.viewFrame = new Rect(0, 0, 0, 0);
		
		this.drawScale = new Point(1, 1);
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.yRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.axes = new Axes();
	
		this.datasetViews = [];
	
		// add resize listener and set initial size
		this.resizeHandler = this.resize.bind(this);
		window.addEventListener("resize", this.resizeHandler, true);
		this.resize();
	}
	
	addDatasetView(datasetView)
	{
		this.datasetViews.push(datasetView);
		datasetView.setChart(this);
		datasetView.resize(this.viewFrame);
		
		this.recalculateRanges();
		this.axes.resize(this);
	}
	
	dataToCoord(x, y)
	{
		return new Point(	this.viewFrame.x + (x - this.xRange.x) * this.drawScale.x,
							this.viewFrame.height + this.viewFrame.y - ((y - this.yRange.x) * this.drawScale.y));
	}
	
	resize()
	{
		// our container may have changed size, have to change the canvas size manually
		this.canvas.width = this.container.clientWidth;
		this.canvas.height = this.container.clientHeight;
		
		this.viewFrame = new Rect(20, 20, this.canvas.width - 50, this.canvas.height - 50);
		this.recalculateRanges();
		
		this.axes.resize(this);
		
		this.draw();
	}
	
	recalculateRanges()
	{
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.yRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		for(var i=0;i<this.datasetViews.length;++i)
		{
			var dview = this.datasetViews[i];
			dview.resize(this.viewFrame);
			
			// find our maximal range
			if(this.xRange.x > dview.xRange.x)	this.xRange.x = dview.xRange.x;
			if(this.xRange.y < dview.xRange.y)	this.xRange.y = dview.xRange.y;
			if(this.yRange.x > dview.yRange.x)	this.yRange.x = dview.yRange.x;
			if(this.yRange.y < dview.yRange.y)	this.yRange.y = dview.yRange.y;
		}
		
		this.drawScale = new Point(	this.viewFrame.width / (this.xRange.y - this.xRange.x),
									this.viewFrame.height / (this.yRange.y - this.yRange.x));
	}
	
	drawFrame(ctx)
	{
		ctx.save();
		ctx.strokeStyle = "#000"
		ctx.lineWidth = 2;
		ctx.shadowColor = '#999';
		ctx.shadowBlur = 3;
		ctx.shadowOffsetX = 1;
		ctx.shadowOffsetY = 1;
		ctx.strokeRect(this.viewFrame.x, this.viewFrame.y, this.viewFrame.width, this.viewFrame.height);
		ctx.restore();
	}
	
	draw()
	{
		var ctx = this.context;
	
		// clear the canvas
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// draw the frame
		this.drawFrame(ctx);
		
		this.axes.draw(ctx, this);
		
		// draw subviews
		for(var i=0;i<this.datasetViews.length;++i)
		{
			ctx.save();
			this.datasetViews[i].draw(ctx);
			ctx.restore();
		}
	}
}



function initializeDragAndDrop(elementId, fileCallback)
{
	window.addEventListener("dragover", function (e) {
	    e.preventDefault();
	});

	window.addEventListener("drop", function (e) {
	    e.preventDefault();
	    if(e.dataTransfer.files.length == 1)
	    {
			var reader = new FileReader();
			reader.onload = function(evt) {
				fileCallback(evt.target.result);
			}
			reader.readAsText(e.dataTransfer.files[0])
	    }
	});
};

$.fn.UseTooltip = function () {
    var previousPoint = null;
     
    $(this).bind("plothover", function (event, pos, item) {         
        if (item) {
            if (previousPoint != item.dataIndex) {
                previousPoint = item.dataIndex;
 
                $("#tooltip").remove();
                 
                var x = item.datapoint[0];
                var y = item.datapoint[1];                
                 
                showTooltip(item.pageX, item.pageY,
                  "<br/>" + "<strong>" + y + "</strong> (" + item.series.label + ")");
            }
        }
        else {
            $("#tooltip").remove();
            previousPoint = null;
        }
    });
};

function showTooltip(x, y, contents) {
    $('<div id="tooltip">' + contents + '</div>').css({
        position: 'absolute',
        display: 'none',
        top: y + 5,
        left: x + 20,
        border: '2px solid #4572A7',
        padding: '2px',     
        size: '10',   
        'background-color': '#fff',
        opacity: 0.80
    }).appendTo("body").fadeIn(200);
}


