
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
		this.subviewCount = [];

		for(var i=0;i<systemData.length;++i)
		{
			var obj = systemData[i];
			this.timeMarks.push(Math.floor(obj["timestamp"]));
			this.frameRate.push(obj["fps"]);
			this.mainThreadLoad.push(obj["mainThreadUsage"]);
			this.backgroundThreadLoad.push(obj["backgroundThreadUsage"]);
			this.residentMemory.push(obj["residentMemory"]);
			this.residentMemoryPeak.push(obj["residentMemoryPeak"]);
			this.subviewCount.push(obj["subviewCount"]);
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
				ctx.fillText(this.name, x0 + 4, ypos + yheight/2 + 4, width);	
			}
		}
	}
}

class EBNChannelStats
{
	constructor(channelData)
	{
		this.colors = [	"#E5BDFF", "#E8E8E8", "#FF8F8C", "#E8A487", "#FFD194",
						"#B25350", "#3EB267", "#994117", "#8CFFB4", "#5B9ACC",
						"#FCFFA5", "#A452CC", "#9AFFCD", "#B28F48", "#7F9926"];

		this.xRange = new Point(Number.MAX_VALUE, Number.MIN_VALUE);
		
		this.blockArrays = [];
		for(var i=0;i<channelData.length;++i)
		{
			var obj = channelData[i];
			var evts = obj["events"];
			if(Object.keys(evts).length > 0)
			{
				var block = new EBNBlockArray(obj["id"]);
				var eventArray = this.dictionaryToArraySortedByValue(evts)
				for(var j=1;j<eventArray.length;++j)
				{
					block.addBlock(new Point(eventArray[j-1][1], eventArray[j][1]), this.colors[j % this.colors.length]);
				}
				this.blockArrays.push(block);
				
				// calculate our range
				if(this.xRange.x > block.xRange.x)	this.xRange.x = block.xRange.x;
				if(this.xRange.y < block.xRange.y)	this.xRange.y = block.xRange.y;
			}
		}
	}
	
	dictionaryToArraySortedByValue(dict)
	{
		var tuples = [];
		for (var key in dict)
	 		tuples.push([key, dict[key]]);
		tuples.sort(function(a, b) { return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0 });
		return tuples;
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
			block.addBlock(new Point(timecount, btime + processTime), "#AA50FF");
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
		this.appSpeedStats = new EBNChannelStats(log["AppSpeed"]);
	}
	
	deviceName()
	{
		return IOS_DEVICES[this.hardwareStats["deviceType"]];
	}
	
};

