
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
	
	contains(point)
	{
		return	point.x >= this.x && point.x < this.x + this.width &&
				point.y >= this.y && point.y < this.y + this.height;
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
		this.drawRect = null;
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
	
	containsCoordPoint(coordPoint)
	{
		if(this.drawRect)
			return this.drawRect.contains(coordPoint);
		return false;
	}
	
	draw(ctx, chart, ypos, yheight)
	{
		var x0 = 0;
		var xN = 0;
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
			xN = coord1.x;
		}
		
		this.drawRect = new Rect(x0, ypos, xN - x0, yheight);

		// ID
		if(this.name)
		{
			var width = xN - x0;
			var metrics = ctx.measureText(this.name);
			if(metrics.width < width + 4)
			{
				ctx.fillStyle = "#000";
				ctx.fillText(this.name, x0 + 4, ypos + yheight/2, width);	
			}
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
				if(this.xRange.x > block.xRange.x)	this.xRange.x = block.xRange.x;
				if(this.xRange.y < block.xRange.y)	this.xRange.y = block.xRange.y;
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
			
			// remove outliers
			if(obj["comment"] == "trackEvent" || obj["comment"] == "EBNNotificationSubscriptionExpSvc")
				continue;
				
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
			block.addBlock(new Point(btime, btime + blocked), "#EEE");
			btime += blocked;
			block.addBlock(new Point(btime, btime + connect), "#EEE");
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
			
			// calculate our range
			if(this.xRange.x > block.xRange.x)	this.xRange.x = block.xRange.x;
			if(this.xRange.y < block.xRange.y)	this.xRange.y = block.xRange.y;
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
		this.hardwareStats = log["hardware"];
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
//		this.drawScale = new Point(1, 1);
		this.viewFrame = new Rect(0, 0, 0, 0);
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
	
	resize(frame)
	{
		this.viewFrame = frame;
		// this.drawScale = new Point(	frame.width / (this.xRange.y - this.xRange.x),
		// 							frame.height / (this.yRange.y - this.yRange.x));
	}
	
	draw(ctx)
	{
	}
	
	mouseOver(coordPoint, dataPoint)
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
		var startCoord;
		for(var i=0;i<this.timeArray.length;++i)
		{
			var coord = this.chart.dataToCoord(this.timeArray[i], this.dataArray[i]);
			if(i == 0)
			{
				startCoord = coord;
				ctx.moveTo(coord.x, coord.y);
			}
			else
			{
				ctx.lineTo(coord.x, coord.y);
			}
			
		}
		
		ctx.strokeStyle = (this.options.color == undefined) ? '#000' : this.options.color;
		ctx.lineWidth = 2;
		ctx.shadowColor = '#999';
		ctx.shadowBlur = 4;
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		
		if(this.options.fillColor != undefined)
		{
			ctx.stroke();
		
			coord = this.chart.dataToCoord(this.xRange.y, this.yRange.x);
			ctx.lineTo(coord.x, coord.y);
			coord = this.chart.dataToCoord(this.xRange.x, this.yRange.x);
			ctx.lineTo(coord.x, coord.y);
			
			ctx.closePath();
			ctx.fillStyle = this.options.fillColor;
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
		this.blockStagger = false;
		
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
	
	mouseOver(coordPoint, dataPoint)
	{
		var blocks = this.genericBlocks.blockArrays;
		for(var i=0;i<blocks.length;++i)
		{
			var block = blocks[i];
			if(block.containsCoordPoint(coordPoint))
			{
			}
		}
		
	}
	
	draw(ctx, chart)
	{
		super.draw(ctx);
		
		ctx.font = "16px serif";
	
		var startStagger = 0;
		var ypos = this.viewFrame.y + this.blockTop;
		var blocks = this.genericBlocks.blockArrays;
		for(var i=0;i<blocks.length;++i)
		{
			if(this.blockStagger)
			{
				if(i > 0)
				{
					var overlap = false;
					for(var j=startStagger;j<i;++j)
					{
						if(blocks[i].overlaps(blocks[j]))
						{
							overlap = true;
							break;
						}
					}
					if(overlap)
					{
						ypos += this.blockHeight;
					}
					else
					{
						// reset 
						startStagger = i;
						ypos = this.viewFrame.y + this.blockTop;
					}
				}
			}
			else
			{
				if(i % 2 == 0)
					ypos = this.viewFrame.y + this.blockTop;
				else
					ypos += this.blockHeight;
			}
				
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
		this.zoomScale = new Point(1, 1);
		this.panOffset = new Point(0, 0);
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.yRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.axes = new Axes();
	
		this.datasetViews = [];
	
		// add resize listener and set initial size
		this.resizeHandler = this.resize.bind(this);
		window.addEventListener("resize", this.resizeHandler, true);
		this.resize();
		
		
		// panning & zooming
		this.mouseDownHandler = this.mouseDown.bind(this);
		this.canvas.addEventListener('mousedown', this.mouseDownHandler, false);
		this.mouseMoveHandler = this.mouseMove.bind(this);
		this.canvas.addEventListener('mousemove', this.mouseMoveHandler, false);
		this.mouseUpHandler = this.mouseUp.bind(this);
		this.canvas.addEventListener('mouseup', this.mouseUpHandler, false);
		this.canvas.addEventListener('mouseout', this.mouseUpHandler, false);
		this.scrollHandler = this.handleScroll.bind(this);
		this.canvas.addEventListener('DOMMouseScroll', this.scrollHandler, false);
		this.canvas.addEventListener('mousewheel', this.scrollHandler, false);
		
		this.lastX = this.canvas.width/2
		this.lastY = this.canvas.height/2;
		this.dragStart = null;
		this.dragged = false;
		this.scaleFactor = 1.0;
	}
	
	removeAllDatasetViews()
	{
		this.viewFrame = new Rect(0, 0, 0, 0);
		this.drawScale = new Point(1, 1);
		this.zoomScale = new Point(1, 1);
		this.panOffset = new Point(0, 0);
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.yRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.axes = new Axes();
		this.datasetViews = [];
	}
	
	addDatasetView(datasetView)
	{
		this.datasetViews.push(datasetView);
		datasetView.setChart(this);
		datasetView.resize(this.viewFrame);
		
		this.recalculateRanges();
		this.axes.resize(this);
	}
	
	dataToCoord(dx, dy)
	{
		return new Point(	this.panOffset.x + this.viewFrame.x + (dx - this.xRange.x) * this.drawScale.x * this.zoomScale.x,
							this.panOffset.y + this.viewFrame.height + this.viewFrame.y - ((dy - this.yRange.x) * this.drawScale.y * this.zoomScale.y));
	}
	
	coordToData(cx, cy)
	{
		return new Point(	(cx - this.panOffset.x - this.viewFrame.x) / (this.drawScale.x * this.zoomScale.x) + this.xRange.x,
							-this.yRange.x - (cy - this.panOffset.y - this.viewFrame.height - this.viewFrame.y) / (this.drawScale.y * this.zoomScale.y));
	}
	
	resize()
	{
		// our container may have changed size, have to change the canvas size manually
		this.canvas.width = this.container.clientWidth;
		this.canvas.height = this.container.clientHeight;
		
		this.lastX = this.canvas.width/2
		this.lastY = this.canvas.height/2;
		
		this.viewFrame = new Rect(20, 20, this.canvas.width - 50, this.canvas.height - 50);
		this.recalculateRanges();
		
		this.axes.resize(this);
		
		this.draw();
	}
	
	mouseDown(evt)
	{
		this.dragging = true;
		this.dragStartPoint = new Point(evt.offsetX - this.panOffset.x, evt.offsetY - this.panOffset.y);
	}
	
	mouseMove(evt)
	{
		if(this.dragging)
		{
			this.panOffset.x = evt.offsetX - this.dragStartPoint.x;
			this.pinOffsets();
			this.draw();
		}
		else
		{
			var coordPoint = new Point(evt.offsetX, evt.offsetY);
			var dataPoint = this.coordToData(evt.offsetX, evt.offsetY)
			for(var i=0;i<this.datasetViews.length;++i)
			{
				if(this.datasetViews[i].mouseOver(coordPoint, dataPoint))
					break;
			}
		}
	}
	
	mouseUp(evt)
	{
		this.dragging = false;
	}
	
	handleScroll(evt)
	{
		var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
		if (delta)
		{
			this.zoomScale.x = Math.max(1.0, this.zoomScale.x - delta);
			this.pinOffsets();
			this.draw();
		}
		return evt.preventDefault() && false;
	}
	
	pinOffsets()
	{
		// make sure we still have some data in range
		if(this.panOffset.x > 0)
			this.panOffset.x = 0;
		else if(this.panOffset.x + (this.xRange.y - this.xRange.x) * this.drawScale.x * this.zoomScale.x < this.viewFrame.width)
			this.panOffset.x = this.viewFrame.width - ((this.xRange.y - this.xRange.x) * this.drawScale.x * this.zoomScale.x);
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
	
	draw()
	{
		var ctx = this.context;
	
		// clear the canvas
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// draw the frame
		ctx.save();
		ctx.strokeStyle = "#000"
		ctx.lineWidth = 2;
		ctx.shadowColor = '#999';
		ctx.shadowBlur = 3;
		ctx.shadowOffsetX = 1;
		ctx.shadowOffsetY = 1;
		ctx.strokeRect(this.viewFrame.x, this.viewFrame.y, this.viewFrame.width, this.viewFrame.height);
		ctx.restore();
		
		this.axes.draw(ctx, this);
		
		// clip to the inner parts of the viewRect
		ctx.save();
		ctx.rect(this.viewFrame.x, this.viewFrame.y, this.viewFrame.width, this.viewFrame.height);
		ctx.stroke();
		ctx.clip();
		
		// draw subviews
		for(var i=0;i<this.datasetViews.length;++i)
		{
			ctx.save();
			this.datasetViews[i].draw(ctx);
			ctx.restore();
		}
		
		ctx.restore();
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


