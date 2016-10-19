

class EBNChart
{
	constructor(containerId)
	{
		this.container = document.getElementById(containerId);
		
		this.canvas = document.createElement("canvas");
		this.container.appendChild(this.canvas);
		this.context = this.canvas.getContext("2d");
		this.canvas.style.position = "absolute";
		this.canvas.style.left = 0;
		this.canvas.style.top = 0;
		this.canvas.style.zIndex = 2;
				
		this.overlay = document.createElement("canvas");
		this.container.appendChild(this.overlay);
		this.ocontext = this.overlay.getContext("2d");
		this.overlay.style.position = "absolute";
		this.overlay.style.left = 0;
		this.overlay.style.top = 0;
		this.overlay.style.zIndex = -2;
		
		this.viewFrame = new Rect(0, 0, 0, 0);
		this.drawScale = new Point(1, 1);
		this.zoomScale = new Point(1, 1);
		this.panOffset = new Point(0, 0);
		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.yRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		this.axes = new Axes();
		this.crosshair = new Crosshair(this);
	
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
		this.overlay.width = this.container.clientWidth;
		this.overlay.height = this.container.clientHeight;
		
		this.lastX = this.canvas.width/2
		this.lastY = this.canvas.height/2;
		
		this.viewFrame = new Rect(20, 20, this.canvas.width - 50, this.canvas.height - 50);
		this.recalculateRanges();
		
		this.axes.resize(this);
		
		this.draw();
	}
	
	mouseDown(evt)
	{
		if(this.zoomScale.x > 1)
		{
			this.dragging = true;
			this.dragStartPoint = new Point(evt.offsetX - this.panOffset.x, evt.offsetY - this.panOffset.y);
		}
		else
		{
			this.dragZoom =	true
			this.dragZoomStartPoint = new Point(evt.offsetX - this.panOffset.x, evt.offsetY - this.panOffset.y);
		}
	}
	
	mouseMove(evt)
	{
		var coordPoint = new Point(evt.offsetX, evt.offsetY);
		
		if(this.dragging)
		{
			this.panOffset.x = evt.offsetX - this.dragStartPoint.x;
			this.pinOffsets();
			this.draw();
		}
		else if(this.dragZoom)
		{
			this.crosshair.setDragPoint(coordPoint);
		}
		else
		{
			this.crosshair.setPoint(coordPoint);
			
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
		if(this.dragZoom && this.crosshair.dragPoint)
		{
			var x0 = this.coordToData(this.crosshair.point.x, 0).x;
			var x1 = this.coordToData(this.crosshair.dragPoint.x, 0).x;
			var minCoord = Math.min(x0, x1);
			var maxCoord = Math.max(x0, x1);
			this.zoomScale = new Point((this.xRange.y - this.xRange.x) / (maxCoord - minCoord), 1);
			this.panOffset.x = - (minCoord - this.xRange.x) * (this.drawScale.x * this.zoomScale.x) - this.viewFrame.x;
			this.crosshair.setDragPoint(null);
			this.draw();
		}
		this.dragging = false;
		this.dragZoom = false;
	}
	
	handleScroll(evt)
	{
		var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
		if (delta)
		{
//			var midCoord = this.coordToData(this.viewFrame.width / 2, 0);
			
			this.zoomScale.x = Math.max(1.0, this.zoomScale.x - delta);

//			var nPanOffset = this.dataToCoord(midCoord);
//			console.log(minCoord0, minCoord1);
//			this.panOffset.x = - (minCoord - this.xRange.x) * (this.drawScale.x * delta) - this.viewFrame.x;
			
			this.axes.resize(this);
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

class Axes
{
	constructor()
	{
		this.tickCount = 1;
	}
	
	resize(chart)
	{
		this.tickCount = new Point(1, 1);
		
		var x0 = chart.coordToData(chart.viewFrame.x, 0);
		var x1 = chart.coordToData(chart.viewFrame.x + chart.viewFrame.width, 0)
		
		var xlen = Math.floor(x1.x - x0.x);
//		var xlen = Math.floor(chart.xRange.y - chart.xRange.x);
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

class Crosshair
{
	constructor(chart)
	{
		this.chart = chart;
	}
	
	setPoint(point)
	{
		this.point = point;
		this.dragPoint = null;
		
		var frame = this.chart.viewFrame;
		if(this.point.x < frame.x)
			this.point.x = frame.x;
		else if(this.point.x >= frame.x + frame.width)
				this.point.x = frame.x + frame.width;
				
		this.draw(this.chart.ocontext, frame);
	}
	
	setDragPoint(point)
	{
		this.dragPoint = point;
		
		if(this.dragPoint)
		{
			var frame = this.chart.viewFrame;
			if(this.dragPoint.x < frame.x)
				this.dragPoint.x = frame.x;
			else if(this.dragPoint.x >= frame.x + frame.width)
					this.dragPoint.x = frame.x + frame.width;
				
			this.draw(this.chart.ocontext, frame);
		}
	}
	
	draw(ctx, frame)
	{
		ctx.save();
		ctx.clearRect(0, 0, this.chart.overlay.width, this.chart.overlay.height);
		
		if(this.dragPoint)
		{
			ctx.strokeStyle = "#F00";
			ctx.beginPath();
			ctx.moveTo(this.point.x, frame.y);
			ctx.lineTo(this.point.x, frame.y + frame.height);
			ctx.stroke();
			
			ctx.beginPath();
			ctx.moveTo(this.dragPoint.x, frame.y);
			ctx.lineTo(this.dragPoint.x, frame.y + frame.height);
			ctx.stroke();
			
			ctx.fillStyle = "#F00";
			ctx.globalAlpha = 0.2;
			var minX = Math.min(this.point.x, this.dragPoint.x);
			var width = Math.abs(this.point.x - this.dragPoint.x);
			ctx.fillRect(minX, frame.y, width, frame.height);
			ctx.globalAlpha = 1.0;
		}
		else if(this.point)
		{
			ctx.strokeStyle = "#F00";
			ctx.beginPath();
			ctx.moveTo(this.point.x, frame.y);
			ctx.lineTo(this.point.x, frame.y + frame.height);
			ctx.stroke();
		}
		ctx.restore();
	}
}

class DatasetView
{
	constructor(timeArray, dataArray, options)
	{
		this.timeArray = timeArray;
		this.dataArray = dataArray;
		this.options = options;
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
	constructor(channelBlocks, options)
	{
		super(channelBlocks, null);
		this.channelBlocks = channelBlocks;
		this.xRange = this.channelBlocks.xRange;
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
		var blocks = this.channelBlocks.blockArrays;
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
		var blocks = this.channelBlocks.blockArrays;
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
					// if(overlap)
					// {
					// 	ypos += this.blockHeight;
					// }
					// else
					// {
					// 	// reset 
					// 	startStagger = i;
					// 	ypos = this.viewFrame.y + this.blockTop;
					// }
					
					ypos += this.blockHeight;
					if(ypos > this.viewFrame.y + this.viewFrame.height)
					{
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
				
			blocks[i].draw(ctx, this.chart, ypos, this.blockHeight-1);
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
