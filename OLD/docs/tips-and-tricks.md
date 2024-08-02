**Below are a collection of useful tips, tricks and code submitted by the community:**

## Control the boiler heating

_(by @Oderik)_

In a very simple setup a boiler provides heat to one heating circuit. If `heating activated` is `on`, the boiler maintains the `selected flow temperature` by regulating the burner and the heat pump.

Once the `current flow temperature` exceeds the `selected flow temperature` + `temperature hysteresis off`, the heating will stop until the `current flow temperature` drops below the `selected flow temperature` + `temperature hysteresis on` (which is typically a negative value).

Thus to activate the heating you will need to set `heatingactivated` to `on` and set an appropriate `flowtemp`. The latter should be derived from the `heating temperature setting` which can be set using the physical dial/control on the boiler. It should be considered as the maximum flow temperature. You can also use a lower flow temperature to maintain a constant room temperature once the initial heating is done.

Additional info from Michael:

You can set the flowtemp with EMS-ESP directly on the boiler without using a Thermostat. Many users do this. Some pointers:

- the flowtemp value on the control panel has to be set higher as the temperature sent over the EMS bus is only accepted if it has a lower value
- you have to send a value at least every minute to maintain the flowtemp, otherwise the boiler will automatically fall back to the higher setpoint from the control panel.
- There is a special EMS-ESP entity called `forceheatingoff` that sets the flowtemp value to 0 every minute automatically to the boiler. Other users prefer like to use an on/off control instead.

## Retrieve data via REST using PHP

_(by @flohse123)_

```php
<?php
$ch = curl_init("http://<myIP>/api?device=thermostat&cmd=info");
curl_exec($ch);
curl_close($ch);
?>
```

## Adjusting the flow temperature based on whether CH or DHW is being heated

_(by @IanC)_

<!-- prettier-ignore -->
!!! quote "From the Discord post IanC said:"
    "With a ~2012 Worcester Bosch boiler, house heating is managed by an EvoHome system that knows which parts of house need how much heat, but it can only use an on/off relay to control the boiler for space and water heating. This means it cannot directly control flow temperature, and historically this has been set at continuous 65C via dial on front of boiler to allow water heating when needed. Very pleased to have added EMS-ESP to my system to help manage flow temperatures. I wrote a simple C program to run on my OpenWrt internet router which eavesdrops on EvoHome messages to capture useful information on what amount of heat is needed for space and water into simple txt files in /tmp. I then schedule a shell script every 4 minutes which uses a few steps to select a flow temperature: start with a weather compensated value based on exterior temperature from online service; adjust this up or down by up to 25% based on EvoHome space heat demand; if necessary override this to heat hot water. The selected flow temperature and a max burner level are then sent via curl to a @BBQKees device running EMS-ESP which in turn controls boiler. So far it seems to be working as intended without loss of house comfort but with much lower flow temperatures observed to try and encourage boiler operating in condensing zone.  Very hard to tell if it is affecting gas consumption - which I would like it to :). Main challenge I still see is how to stop EvoHome causing frequent on/off cycles of boiler while it still tries to use TPI flow control management."

![1.5.0](_media/examples/ian_setflowtemp.png)

The temperature compensation algorithms are in the shell script:

```sh title="set_flowtemp.sh"
#!/bin/sh -x
MINFLOW=30.0
MAXFLOW=70.0

function set_flowtemp() {
local boiler_key=$(cat /tmp/boiler-key.txt)
curl --silent http://192.168.0.140/api/boiler/selflowtemp \
  -H "Content-Type: application/json" -d "{ "value" : $1 }" \
  -H "Authorization: Bearer $boiler_key"

local burner_power=$(echo $1 | awk '{ \
if ($1 < 40.0) bp = 35;\
else if ($1 < 50.0) bp = 50;\
else if ($1 < 60.0) bp = 65;\
else bp = 90.0; \
printf "%2.1f", bp}')

curl --silent http://192.168.0.140/api/boiler/selburnpow \
  -H "Content-Type: application/json" -d "{ "value" : $burner_power }" \
  -H "Authorization: Bearer $boiler_key"
}

function dhw_active(){
  local active="false"
  if [[ -f /tmp/relay_dhw ]]; then
    active=$(cat /tmp/relay_dhw | awk '{if ($1 == 0.0) print "false"; else print "true";}')
  else
    local curr_hour=$(date +%H)
    if [[ $curr_hour -eq 6 ]] || [[ $curr_hour -eq 16 ]]; then
      active="true"
    fi
  fi

  echo $active
}

function dhw_flowtemp(){
  if [[ -f  /tmp/temp_dhw ]]; then
    echo $(cat /tmp/temp_dhw | awk '{printf "%2.1f", $1 + 20.0}')
  else
    echo $MAXFLOW
  fi
}

function outside_temp(){
  if [[ -f  /tmp/meteo.$(date +%Y%m%d) ]]; then
    echo $(cat /tmp/meteo.$(date +%Y%m%d)|jq .hourly.temperature_2m[$(date +%H)])
  else
    echo UNKNOWN
  fi
}

function weather_flowtemp(){
  local otemp=$(outside_temp)
  if [[ $otemp = "UNKNOWN" ]]; then
    # Default flow temperature if no outside temperature available
    echo 65.0
  else
    # Calculated flow temperature if outside temperature available
    # echo $(echo $otemp | awk '{printf "%2.1f", 70.0 - ($1 + 5) * 1.5}')
    echo $(echo $otemp $MINFLOW $MAXFLOW | awk '{printf "%2.1f", $2 + ($3 - $2) / 25.0 * (20.0 - $1)}')
  fi
}

function load_flowtemp(){
  if [[ -f  /tmp/relay_ch ]]; then
    echo $(cat /tmp/relay_ch | awk '{printf "%2.1f", 20.0 + ($1 * 0.50)}')
  else
    echo $(weather_flowtemp)
  fi
}
function load_factor(){
  if [[ -f  /tmp/relay_ch ]]; then
    local relay_demand=$(cat /tmp/relay_ch)
    echo $(echo $1 $relay_demand $MINFLOW | awk '{printf "%2.1f", $3 + ($1 - $3) * (0.75 + $2 / 200.0)}')
  else
    echo $1
  fi
}

function max(){
  echo $(echo $1 $2 | awk '{if ($2 > $1) printf "%2.1f", $2; else printf "%2.1f", $1;}')
}

function min(){
  echo $(echo $1 $2 | awk '{if ($2 < $1) printf "%2.1f", $2; else printf "%2.1f", $1;}')
}

flowtemp=$(weather_flowtemp)
flowtemp=$(load_factor $flowtemp)
if [ $(dhw_active) = "true" ]; then
  alt_flowtemp=$(dhw_flowtemp)
  flowtemp=$(max $flowtemp $alt_flowtemp)
fi
flowtemp=$(min $flowtemp $MAXFLOW)
set_flowtemp $flowtemp
```

## Home Assistant sensor template for all status numbers on a GB192 Boiler

(by @tefracky from <https://github.com/emsesp/EMS-ESP32/issues/938#issuecomment-1417592878>)

Here is the sensor in the new Home-Assistant template format for all status numbers for the Buderus GB192i-19 in German:

```yaml title="Service code number text for Buderus GB192i-19"
- name: 'Heizungsstatus'
  attributes:
    service-code: "{{states('sensor.heizung_ems_esp_boiler_statusmeldungsnummer')|int(0)}}"
    timestamp: "{{now().strftime('%Y-%m-%d %H:%M:%S')}}"
    date: >
      {{ now().timestamp() | timestamp_custom("%Y-%m-%d", true) }}
    time: >
      {{ now().timestamp() | timestamp_custom("%H:%M:%S", true) }}
  state: >-
    {% set mapper = {
        '200' : '200 - Das Gerät befindet sich im Heizbetrieb.',
        '201' : '201 - Das Gerät befindet sich im Warmwasserbetrieb.',
        '202' : '202 - Wartephase des Geräts. Wärmeanforderung durch RC-Regelgerät oder einen ON/OFF-Thermostat erfolgt in Intervallen von weniger als 10 Minuten.',
        '203' : '203 - Betriebsbereitschaft: keine Wärmeanforderung vorhanden',
        '204' : '204 - Wartephase des Geräts. Die gemessene Vorlauf- temperatur ist höher als die berechnete oder eingestellte Heizwassertemperatur. - Eingestellte Heizwassertemperatur am Gerät prüfen. Heizwassertemperatur ggf. erhöhen. Bei einer außentemperaturgeführten Regelung die eingestellte Heizkurve am Raumthermostat prüfen. Heizkurve ggf. ändern. Verkabelung und Funktion des Speichertemperaturfühlers prüfen. Bauteil ggf. austauschen.',
        '207' : '207 - Der Betriebsdruck ist zu niedrig (weniger als 0,2 bar). - Heizungsanlage bis zu 2 bar füllen. Ausdehnungsgefäß prüfen. Heizungsanlage auf undichte Stellen prüfen. Verkabelung und Funktion des Druckfühlers prüfen. Bauteil ggf. austauschen.',
        '208' : '208 - Das Gerät befindet sich im Schornsteinfegerbe-trieb oder Servicebetrieb.',
        '210' : '210 - Vom Abgastemperaturfühler gemessene Tem- peratur ist zu hoch und ist dadurch geöffnet. - Funktion des Abgastemperaturfühlers prüfen. Bauteil ggf. austauschen. Gerät auf Verschmutzung prüfen. Gerät ggf. warten.',
        '212' : '212 - Der Vorlauf- oder Sicherheitstemperaturfühler misst einen zu schnellen Temperaturanstieg. - Betriebsdruck prüfen. Heizungsanlage und Gerät entlüften. Heizungsanlage auf ausreichenden Wasserdurchfluss prüfen. Verkabelung und Funktion der Pumpe und des jeweiligen Temperaturfühlers prüfen. Bauteil ggf. austauschen.',
        '213' : '213 - Der Vorlauf- oder Rücklauftemperaturfühler misst einen zu schnellen Temperaturanstieg. - Betriebsdruck prüfen. Heizungsanlage und Gerät entlüften. Heizungsanlage auf ausreichenden Wasserdurchfluss prüfen. Wärmeleistung nach der Größe der Heizungsanlage einstellen. Verkabelung zur Pumpe oder zum jeweiligen Temperaturfühler prüfen. Bauteil ggf. austauschen.',
        '214' : '214 - Das Gebläse wird während der Sicherheitszeit abgeschaltet. - Verkabelung und Steckverbindungen des Gebläses prüfen. Betriebsverhalten des Geräts durch Austauschen des Gebläses prüfen. Steckverbindungen des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '215' : '215 - Das Gebläse läuft zu schnell. - Abgasanlage prüfen, ggf. reinigen oder instandsetzen.',
        '216' : '216 - Das Gebläse läuft zu langsam. - Gebläsekabel mit Stecker prüfen, ggf. austauschen. Gebläse auf Verschmutzung und Blockierung prüfen, ggf. austauschen.',
        '217' : '217 - Das Gebläse läuft unregelmäßig während der Hochfahrphase. - Verkabelung und Steckverbindungen des Gebläses prüfen. Betriebsverhalten des Geräts durch Austauschen des Gebläses prüfen. Steckverbindungen des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '218' : '218 - Die vom Vorlauftemperaturfühler gemessene Temperatur ist höher als 105 °C. - Betriebsdruck prüfen. Heizungsanlage und Gerät entlüften. Heizungsanlage auf ausreichenden Wasserdurchfluss prüfen. Funktion der Pumpe und des Vorlauftemperaturfühlers prüfen. Bauteil ggf. austauschen.',
        '219' : '219 - Der Sicherheitstemperaturfühler misst eine Temperatur über 105 °C. - Betriebsdruck prüfen. Heizungsanlage und Gerät entlüften. Heizungsanlage auf ausreichenden Wasserdurchfluss prüfen. Funktion der Pumpe und des Sicherheitstemperaturfühlers prüfen. Bauteil ggf. austauschen.',
        '220' : '220 - Kurzschluss des Sicherheitstemperaturfühlers oder gemessene Wassertemperatur ist höher als 130 °C.',
        '221' : '221 - Die Kontakte des Sicherheitstemperaturfühlers sind unterbrochen. - Stecker des Sicherheitstemperaturfühlers prüfen. Sicherheitstemperaturfühler austauschen und Betriebsverhalten des Geräts prüfen.',
        '222' : '222 - Die Kontakte des Vorlauftemperaturfühlers sind kurzgeschlossen. - Stecker des Vorlauftemperaturfühlers prüfen. Vorlauftemperaturfühler austauschen und Betriebsverhalten des Geräts prüfen.',
        '224' : '224 - Wärmeblock-Temperaturbegrenzer oder Abgas- temperaturbegrenzer hat ausgelöst. - Wenn die blockierende Störung längere Zeit bestehen bleibt, wird aus der blockie- renden Störung eine verriegelnde Störung. Wärmeblock-Temperaturbegrenzer und Anschlusskabel auf Unterbrechung prü- fen, ggf. austauschen. Bei Störung des Abgastemperaturbegrenzers erscheint eine Meldung max. nach 2 Stunden. Abgastemperaturbegrenzer und Anschlusskabel auf Unterbrechung prüfen, ggf. austauschen. Betriebsdruck der Heizungsanlage prüfen. Im Servicemenü unter EINSTELLUNGEN > SONDERFKT. > ENTLÜFTUNGSFKT. die Entlüftung einschalten und das Gerät entlüften. Pumpenleistung oder Pumpenkennfeld korrekt einstellen und auf maximale Leis- tung anpassen. Im Menü Service unter FUNKTIONSTEST > TESTS AKTIVIEREN > PUMPE die Hei- zungspumpe auf Dauerbetrieb einstellen. Heizungspumpe andrehen, ggf. austauschen. Wärmeblock wasserseitig prüfen, ggf. austauschen.',
        '227' : '227 - Unzureichende Flammenbildung (Ionisations- strom) während des Zündungsversuchs des Brenners. - Gerät auf Verschmutzung prüfen. Dynamischen Gasvordruck prüfen. Gas-Luft-Verhältnis prüfen. Steckverbindungen der Zündeinrichtung prüfen. Zündung und Ionisationsstrom prüfen. Zündeinrichtung auf Beschädigung prüfen. Bauteil ggf. austauschen.',
        '228' : '228 - Flammenbildung (Ionisationsstrom) vor Bren- nerstart. - Steckverbindung der Überwachungselektrode prüfen. Zündeinrichtung auf Beschädigung und Verschleiß prüfen. Bauteil ggf. austauschen.',
        '229' : '229 - Unzureichende Flammenbildung (Ionisations- strom) während des Brennerbetriebs. - Dynamischen Gasvordruck prüfen. Verkabelung und Steckverbindung der Überwachungselektrode prüfen. Zündeinrichtung auf Beschädigung und Verschleiß prüfen. Bauteil ggf. austauschen.',
        '231' : '231 - Unterbrechung der Netzspannung während einer verriegelnden Störung. - Gerät erneut starten (Reset).',
        '232' : '232 - Der externe Schaltkontakt ist geöffnet. - Brücke am Anschluss des externen Schaltkontaktes prüfen. Externen Schaltkontakt prüfen.',
        '233' : '233 - Kodierstecker nicht erkannt. - Kodierstecker richtig aufstecken, ggf. austauschen.',
        '234' : '234 - Die Kontakte der Gasarmatur sind unterbro- chen. - Verkabelung und Steckverbindung der Gasarmatur prüfen. Gasarmatur austauschen und Betriebsverhalten des Geräts prüfen.',
        '235' : '235 - Falscher Kodierstecker (HCM-Modul). - Kodierstecker (HCM-Modul) prüfen.',
        '237' : '237 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '238' : '238 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '239' : '239 - Brennerautomat oder HCM-Modul ist defekt. - Kodierstecker austauschen. Steuergerät austauschen.',
        '240' : '240 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '241' : '241 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '242' : '242 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '243' : '243 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '244' : '244 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '245' : '245 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '246' : '246 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '247' : '247 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '248' : '248 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '249' : '249 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '250' : '250 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '251' : '251 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '252' : '252 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '253' : '253 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '254' : '254 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '255' : '255 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '256' : '256 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '257' : '257 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '258' : '258 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '259' : '259 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '260' : '260 - Der Vorlauftemperaturfühler misst keinen Tem- peraturanstieg nach einem Brennerstart. - Betriebsdruck prüfen. Heizungsanlage und Gerät entlüften. Heizungsanlage auf ausreichenden Wasserdurchfluss prüfen. Verkabelung und Funktion der Pumpe und des Vorlauftemperaturfühlers prüfen. Bauteil ggf. austauschen.',
        '261' : '261 - Brennerautomat ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '262' : '262 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '263' : '263 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '264' : '264 - Gebläse ausgefallen. - Verkabelung und Steckverbindungen des Gebläses prüfen. Gebläse auf Verschmutzung und Blockierung prüfen, ggf. austauschen.',
        '265' : '265 - Ein-/Aus-Betrieb: Der Wärmebedarf ist geringer als die minimale Wärmeleistung.',
        '268' : '268 - Komponententest: Das Gerät befindet sich im Testmodus.',
        '269' : '269 - Zündeinrichtung wurde zu lange aktiviert. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '270' : '270 - Das Gerät wird hochgefahren.',
        '272' : '272 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '273' : '273 - Der Brenner und das Gebläse waren 24 Std. un- unterbrochen in Betrieb und werden zur Sicher- heitskontrolle für kurze Zeit außer Betrieb genommen.',
        '275' : '275 - Wärmepumpe im Enteisungsmodus.',
        '276' : '276 - Die Temperatur am Vorlauftemperaturfühler ist > 95 °C. - Diese Störungsanzeige kann auftreten, ohne dass eine Störung vorliegt, wenn plötz- lich alle Heizkörperventile geschlossen werden. Betriebsdruck der Heizungsanlage prüfen. Wartungshähne öffnen. Im Servicemenü unter FUNKTIONSTEST > TESTS AKTIVIEREN > PUMPE die Hei- zungspumpe auf Dauerbetrieb einstellen. Anschlusskabel zur Heizungspumpe prüfen. Heizungspumpe andrehen, ggf. austauschen. Pumpenleistung oder Pumpenkennfeld korrekt einstellen und auf maximale Leistung anpassen.',
        '280' : '280 - Brennerautomat ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '281' : '281 - Die Heizungspumpe erzeugt keinen Druck. - Betriebsdruck der Heizungsanlage prüfen. Wartungshähne öffnen. Heizungspumpe andrehen, ggf. austauschen.',
        '282' : '282 - Keine Drehzahlrückmeldung der Heizungspumpe. - Verkabelung und Funktion der Heizungspumpe prüfen. Bauteil ggf. austauschen.',
        '283' : '283 - Brennerstart.',
        '284' : '284 - Erste Sicherheitszeit: Die Gasarmatur wird geöffnet.',
        '290' : '290 - Brennerautomat oder HCM-Modul ist defekt. - Verkabelung und Steckverbindung des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '305' : '305 - Das Zeitintervall für die Wasser-Warmhaltung ist noch nicht erreicht.',
        '306' : '306 - Flammenbildung (Ionisationsstrom) nach Ab- schalten des Brenners. - Wärmeblock an der Innenseite um die Zündeinrichtung reinigen. Ionisationsteil der Zündeinrichtung prüfen. Bauteil ggf. austauschen. Prüfen, ob das Gas-Luft-Verhältnis auch nach Abschalten des Brenners vorhan- den ist. Prüfen, ob die Gasarmatur auch nach Abschalten des Brenners weiterhin geöff- net ist. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '307' : '307 - Heizungspumpe im Gerät dreht nicht. - Heizungspumpe austauschen und Betriebsverhalten des Geräts prüfen.',
        '323' : '323 - BUS-Kommunikation unterbrochen. - Anschlusskabel BUS-Teilnehmer prüfen, ggf. austauschen.',
        '328' : '328 - Es ist eine kurzzeitige Unterbrechung der Netz- spannung aufgetreten. - Verkabelung des Trafos prüfen (falls vorhanden). Trafo austauschen und Betriebsverhalten des Geräts prüfen. Prüfen, ob die Störung die Folge des Vorhandenseins eines Stromaggregats, ei- nes Windrads oder einer anderen Ausrüstung gewesen sein könnte, die eine Un- terbrechung verursachen kann. Elektroinstallation prüfen.',
        '330' : '330 - Externer Vorlauftemperaturfühler defekt (hydraulische Weiche). - Temperaturfühler und Anschlusskabel auf Kurzschluss prüfen, ggf. austauschen.',
        '331' : '331 - Externer Vorlauftemperaturfühler defekt (hydraulische Weiche). - Temperaturfühler und Anschlusskabel auf Unterbrechung prüfen, ggf. austauschen.',
        '341' : '341 - Die gemessene Temperatur, durch den Vorlauf- temperaturfühler oder den Rücklauftemperatur- fühler, steigt zu schnell. - Wasserdruck des Geräts prüfen und Heizungsanlage und Gerät entlüften. Prüfen, ob genügend Strömung über die Heizungsanlage möglich ist. Betriebsverhalten und Verkabelung der Pumpe und der betreffenden Fühler prüfen. Bauteil ggf. austauschen.',
        '342' : '342 - Die gemessene Temperatur, durch den Vorlauf- temperaturfühler, steigt zu schnell. - Wasserdruck des Geräts prüfen und Heizungsanlage und Gerät entlüften. Prüfen, ob genügend Strömung über die Heizungsanlage möglich ist. Betriebsverhalten und Verkabelung der Pumpe und der betreffenden Fühler prüfen. Bauteil ggf. austauschen.',
        '350' : '350 - Vorlauftemperaturfühler defekt (Kurzschluss). - Wenn die blockierende Störung längere Zeit bestehen bleibt, wird aus der blockie- renden Störung eine verriegelnde Störung. Temperaturfühler und Anschlusskabel auf Kurzschluss prüfen, ggf. austauschen.',
        '351' : '351 - Vorlauftemperaturfühler defekt (Unterbre- chung). - Wenn die blockierende Störung längere Zeit bestehen bleibt, wird aus der blockie- renden Störung eine verriegelnde Störung. Temperaturfühler und Anschlusskabel auf Unterbrechung prüfen, ggf. austauschen.',
        '356' : '356 - Netzspannung niedriger als erlaubt. - Prüfen, ob die Störung die Folge des Vorhandenseins eines Stromaggregats, ei- nes Windrads oder einer anderen Ausrüstung gewesen sein könnte, die eine Un- terbrechung verursachen kann. Elektroinstallation prüfen.',
        '357' : '357 - Entlüftungsbetrieb.',
        '358' : '358 - Blockierschutz für Heizungspumpe und 3-WegeVentil.',
        '360' : '360 - Des angebrachte HCM-Modul korrespondiert nicht mit dem Brennerautomaten. - HCM-Modul-Nummer kontrollieren. Anbringen des HCM-Moduls mit der korrekten HCM-Modul-Nummer.',
        '361' : '361 - Der angebrachte Brennerautomat korrespon- diert nicht mit dem HCM-Modul. - Nummern auf dem Brennerautomaten kontrollieren. Anbringen des HCM-Moduls mit der korrekten HCM-Modul-Nummer.',
        '364' : '364 - Gasarmatur schließt nicht korrekt. - Verkabelung und Steckverbindung der Gasarmatur prüfen. Gasarmatur austauschen und Betriebsverhalten des Geräts prüfen.',
        '365' : '365 - Gasarmatur schließt nicht korrekt. - Verkabelung und Steckverbindung der Gasarmatur prüfen. Gasarmatur austauschen und Betriebsverhalten des Geräts prüfen.',
        '390' : '390 - Brennerautomaten liest falschen Wert im HCMModul. - HCM-Modul austauschen und Betriebsverhalten des Geräts prüfen.',
        '537' : '537 - Keine Drehzahlrückmeldung vom Gebläse. - Anschlussstecker für die Drehzahlregelung am Gebläse aufstecken. Anschlussstecker für die Spannungsversorgung am Gebläse aufstecken. Anschlusskabel für die Drehzahlregelung zwischen Gebläse und Feuerungs- automat (SAFe) austauschen. Anschlusskabel (230 vAC) zwischen Gebläse und Feuerungsautomat (SAFe) aus- tauschen. Feuerungsautomat (SAFe) austauschen.',
        '550' : '550 - Netzspannung zu niedrig. - Versorgungsspannung von mindestens 196 VAC herstellen. Feuerungsautomat (SAFe) austauschen.',
        '560' : '560 - Luftdruckschalter offen. - Jegliche Blockade entfernen. Luftdruckschalter wieder anschließen. Luftdruckschalter ersetzen.',
        '604' : '604 - Anlagenstörung Feuerungsautomat. - Feuerungsautomat (SAFe) austauschen.',
        '810' : '810 - Warmwasser bleibt kalt. - Evtl. ständige Warmwasserentnahme unterbinden. Warmwasser-Temperaturfühler richtig positionieren. Warmwasserbereitung auf „Vorrang“ einstellen. Evtl. entlüften. Bei Störungen in der Verrohrung dies beheben. Wenn Abweichungen bestehen, die Pumpe austauschen. Zirkulationsleitung prüfen. Bei Abweichungen zu den Tabellenwerten den Fühler austauschen.',
        '811' : '811 - Warmwasserbereitung: Thermische Desinfekti- on misslungen. - Evtl. ständige Warmwasserentnahme unterbinden. Warmwasser-Temperaturfühler richtig positionieren. Warmwasserbereitung auf „Vorrang“ einstellen. Evtl. entlüften. Bei Störungen in der Verrohrung dies beheben. Wenn Abweichungen bestehen, die Pumpe austauschen. Zirkulationsleitung prüfen. Bei Abweichungen zu den Tabellenwerten den Fühler austauschen.',
        '815' : '815 - Temperaturfühler hydraulische Weiche defekt. - Fühleranschluss prüfen. Weichenfühler auf falsche Einbauposition oder auf Bruchstelle prüfen.',
        '1011' : '1011 - Vom Abgastemperaturfühler gemessene Tem- peratur ist zu hoch. - Verkabelung des Temperaturfühlers prüfen. Temperaturfühler prüfen, ggf. austauschen. Anschlusskabel auf Unterbrechung oder Kurzschluss prüfen, ggf. austauschen.',
        '1012' : '1012 - Das Gebläse läuft unregelmäßig. - Verkabelung und Steckverbindungen des Gebläses prüfen. Betriebsverhalten des Geräts durch Austauschen des Gebläses prüfen. Steckverbindungen des Brennerautomaten prüfen. Brennerautomaten austauschen und Betriebsverhalten des Geräts prüfen.',
        '1013' : '1013 - Das Inspektionsintervall ist erreicht. Bitte Inspektion durchführen. - Inspektion durchführen. Nicht blockierende Störung zurücksetzen (erforderlich).',
        '1014' : '1014 - Aktuelle Ionisation ist zu niedrig. - Wartung durchführen.',
        '1017' : '1017 - Der Betriebsdruck ist niedrig. - Heizungsanlage bis zu 2 bar füllen. Ausdehnungsgefäß prüfen. Heizungsanlage auf undichte Stellen prüfen. Verkabelung und Funktion des Druckfühlers prüfen. Bauteil ggf. austauschen.',
        '1018' : '1018 - Service Zeit abgelaufen. - Wartung durchführen.',
        '1019' : '1019 - Falscher Pumpentyp detektiert. - Pumpenkennfeld korrekt einstellen. Steckverbindungen und Kabelbaum auf Kontakt prüfen. Gerät aus- und wieder einschalten. Pumpe austauschen und Betriebsverhalten des Geräts prüfen.',
        '1021' : '1021 - Kaltwassertemperaturfühler des Schichtlade- speichers defekt. - Gerät aus- und wieder einschalten. Verbindungsleitung zum Schichtladespeicherfühler (SLS) reparieren bzw. aus- tauschen. Fühler austauschen.',
        '1022' : '1022 - Speichertemperaturfühler defekt oder Kontakt- probleme. - Angezeigte Speichertemperatur auf Plausibilität prüfen. Steckverbindungen und Kabelbaum auf Kontakt prüfen. Grundeinstellungen zurücksetzen.',
        '1023' : '1023 - Eingestellte Wartungszeit ist überschritten. Wartung erforderlich. - Wartung am Gerät ausführen.',
        '1025' : '1025 - Rücklauftemperaturfühler ist defekt. - Verbindungsleitung zum Rücklauftemperaturfühler reparieren bzw. austauschen. Fühler austauschen.',
        '1065' : '1065 - Wasserdruckfühler defekt oder nicht ange- schlossen. - Anschlussstecker am Wasserdruckfühler korrekt aufstecken. Anschlusskabel zum Wasserdruckfühler austauschen. Wasserdruckfühler austauschen. Steuergerät austauschen.',
        '1068' : '1068 - Außentemperaturfühler oder Lambdasonde de- fekt. - Kontaktproblem beseitigen. Lambdasonde austauschen.',
        '2085' : '2085 - Interner Fehler. - Entriegeln. Anlage für 30 Sekunden spannungsfrei schalten. Feuerungsautomat ersetzen.',
        '2626' : '2626 - Anlagenstörung Geräteelektronik. - Geräteelektronik austauschen.',
        '2908' : '2908 - Anlagenstörung Geräteelektronik / Basiscontroller. - Bleibt die Störung nach Reset erhalten, ist der Feuerungsautomat oder Fremdbrennermodul defekt und muss ausgetauscht werden.',
        '2909' : '2909 - Anlagenstörung Geräteelektronik / Basiscontroller. - Bleibt die Störung nach Reset erhalten, ist der Feuerungsautomat oder Fremdbrennermodul defekt und muss ausgetauscht werden.',
        '2910' : '2910 - Fehler im Abgassystem. - Abgassystem montieren. Ablagerungen im Abgassystem entfernen.',
        '2911' : '2911 - Kalibrierung fehlgeschlagen. - Fehlerhafte Komponente ersetzen.',
        '2912' : '2912 - Kein Flammensignal während der Kalibrierung. - Fehlerhafte Komponente ersetzen.',
        '2913' : '2913 - Flammensignal zu niedrig in der Kalibrierung. - Fehlerhafte Komponente ersetzen.',
        '2914' : '2914 - Anlagenstörung Geräteelektronik. - Bleibt die Störung nach Reset erhalten, ist die Gerätesteuerung oder das Brennermodul defekt und muss ausgetauscht werden.',
        '2915' : '2915 - Anlagenstörung Geräteelektronik. - Gerät zurücksetzen. Eine Wärmeanforderung angeben. Wärmeanforderung beenden. Wenn der Fehler danach wieder auftritt, ist der Brennerregler defekt und muss ausgetauscht werden.',
        '2916' : '2916 - Anlagenstörung Geräteelektronik. - Gerät zurücksetzen. Eine Wärmeanforderung angeben. Wärmeanforderung beenden. Wenn der Fehler danach wieder auftritt, ist der Brennerregler defekt und muss ausgetauscht werden.',
        '2917' : '2917 - Kein Flammensignal während der Überprüfung der Verbrennungsregelung. - Gerät ausschalten. Eine Wärmeanforderung angeben. 5 Minuten warten. Wenn der Fehler innerhalb dieser Zeit wieder auftritt, Gerät zu- rücksetzen, ohne Strom zu trennen. Dadurch wird eine Kalibrierung der Ionisationsschaltungen ausgelöst. Wenn der Fehler nach der Kalibrierung wieder auftritt, ist der Brennerregler de- fekt und muss ausgetauscht werden. Abgasanlage auf mögliche Rezirkulation prüfen.',
        '2918' : '2918 - Störung in der Verbrennungsregelung. - Siphon reinigen und das Gerät entwässern (Gasseite).',
        '2919' : '2919 - Störung in der Verbrennungsregelung. - Fehlerhafte Komponente ersetzen.',
        '2920' : '2920 - Störung Flammenüberwachung. - Feuerungsautomat austauschen.',
        '2921' : '2921 - Geräteelektronik im Testmode. - Keine Maßnahme erforderlich (Wärmeerzeuger startet automatisch).',
        '2922' : '2922 - Anlagenstörung Geräteelektronik. - Feuerungsautomat austauschen.',
        '2923' : '2923 - Anlagenstörung Geräteelektronik. - Geräteelektronik austauschen.',
        '2926' : '2926 - Anlagenstörung Geräteelektronik. - Geräteelektronik austauschen.',
        '2927' : '2927 - Flamme während Brennerbetrieb ausgefallen. - Hauptabsperreinrichtung öffnen. Geräteabsperrhahn öffnen. Gerät stilllegen und Gasleitung überprüfen. Signalauswertung auf Leiterplatte defekt. Überwachungselektrode austauschen. Schutzleiteranschluss (PE) im Steuergerät herstellen. Zündleitung austauschen. Anschlusskabel zur Überwachungselektrode austauschen. Gasarmatur austauschen.',
        '2928' : '2928 - Interner Fehler. - Feuerungsautomat austauschen.'
      }
    %}
    {% set state = states('sensor.heizung_ems_esp_boiler_statusmeldungsnummer') %}
    {% set message = mapper[state] if state in mapper %}
    {{ message }}
```

## Using a custom Climate component in Home Assistant

_(by @elRadix)_ from <https://github.com/emsesp/EMS-ESP32/discussions/790#discussioncomment-4895520>

This example sets up 2 climate entities for dhw with their mode and heating climate using a custom HACS card in HA <https://github.com/nervetattoo/simple-thermostat> like:

![customha](_media/examples/ha_custom_climate.jpg)

```yaml title="configuration.yaml"
mqtt:
  sensor:

  climate:
    - name: boiler
      unique_id: bosh_boiler
      min_temp: 35
      max_temp: 60
      temp_step: 5
      current_temperature_topic: 'ems-esp/boiler_data_ww'
      temperature_state_topic: 'ems-esp/boiler_data_ww'
      temperature_command_topic: 'ems-esp/boiler/wwseltemp'
      temperature_command_template: >
        {{ '{"cmd":"wwseltemp ","data":'}}
        {{ value }}
        {{ '}'}}
      current_temperature_template: '{{ value_json.wwcurtemp }}'
      temperature_state_template: '{{ value_json.wwseltemp }}'
      mode_state_template: "{% if value_json.wwactivated == 'off' %} off {% else %} heat {% endif %}"
      mode_state_topic: 'ems-esp/boiler_data_ww'
      mode_command_topic: 'ems-esp/boiler/wwactivated'
      mode_command_template: >
        {{ '{"cmd":"wwactivated","data":"'}}
        {%- if value == 'off' -%}off{% else %}on{%- endif -%}
        {{'"}'}}
      modes:
        - 'heat'
        - 'off'
      # use fan mode as proxy to set comfort mode
      fan_mode_command_topic: 'ems-esp/boiler/wwcomfort'
      fan_mode_command_template: >
        {{ '{"cmd":"wwcomfort","data":"'}}
        {%- if value == 'eco' -%}eco{%-elif value == 'hot' -%}hot{%- else -%}intelligent{%- endif -%}
        {{'"}'}}
      fan_mode_state_topic: 'ems-esp/boiler_data_ww'
      fan_mode_state_template: '{{ value_json.wwcomfort }}'
      fan_modes:
        - 'eco'
        - 'hot'
        - 'intelligent'

    - name: heating
      unique_id: bosh_heating
      min_temp: 30
      max_temp: 80
      temp_step: 5
      current_temperature_topic: 'ems-esp/boiler_data'
      temperature_state_topic: 'ems-esp/boiler_data'
      temperature_command_topic: 'ems-esp/boiler'
      temperature_command_template: >
        {{ '{"cmd":"heatingtemp","data":'}}
        {{ value }}
        {{ '}'}}
      current_temperature_template: '{{ value_json.curflowtemp }}'
      temperature_state_template: '{{ value_json.heatingtemp }}'
      mode_state_template: "{% if value_json.heatingactivated == 'off' %} off {% else %} heat {% endif %}"
      mode_state_topic: 'ems-esp/boiler_data'
      mode_command_topic: 'ems-esp/boiler'
      mode_command_template: >
        {{ '{"cmd":"heatingactivated","data":"'}}
        {%- if value == 'off' -%}off{% else %}on{%- endif -%}
        {{'"}'}}
      modes:
        - 'heat'
        - 'off'
```

```yaml title="HACS card"
type: custom:simple-thermostat
entity: climate.boiler
sensors:
  - id: state
    label: State
    template: '{{hvac_action}}'
label:
  state: Warm Water
layout:
  mode:
    names: true
    icons: true
    headings: false
  step: column
step_size: '1'
control:
  hvac:
    'off':
      name: Warm Water Off
    heat:
      name: Warm Water On
  fan:
    eco:
      name: eco
    hot:
      name: hot
    intelligent:
      name: smart
decimals: '1'
hide:
  state: false
header:
  toggle:
    entity: switch.ketel
    name: power
  name: Boiler
view_layout:
  position: main
```
