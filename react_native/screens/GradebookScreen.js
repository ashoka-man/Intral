import React, { useState, useEffect, useCallback } from 'react';
import { useIsFocused, useNavigation, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { getGrades } from '../components/api.js';
import dropDownImg from '../assets/images/icons8-expand-arrow.gif';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    SafeAreaView,
    FlatList,
    Image,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import {
    BarChart,
    LineChart,
} from 'react-native-chart-kit';
import { withSafeAreaInsets } from 'react-native-safe-area-context';

const chartConfig = {
    backgroundGradientFrom: "#1E2923",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#08130D",
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2, 
    barPercentage: 0.75,
    useShadowColorFromDataset: false // optional
};

const username = 'your username' // should import username and password from a central location after authentication
const password = 'your password'
const screenWidth = Dimensions.get('window').width;
let quarter = 1;

const wait = (timeout) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

const GradebookPage = () => {
    const [isLoading, setIsLoading] = useState(true);  
    const [refreshing, setRefreshing] = useState(false);
    const [classes, setClasses] = useState([]);
    const isFocused = useIsFocused();               // Will be used to determine if the user is focused on the screen (aka if the user is looking at the gradepage) 
                                                    // NOTE: Should probably have student reload manually (if there are no changes), reloading on each focus seems wasteful and inefficient
    const refreshClasses = async() => {             // async function to provide scope for await keyword
        try {
            let pull = await getGrades(username, password, quarter); // pulls data from api asyncronously from api.js
            setClasses(pull);
            setIsLoading(false);
        } catch(err) {
            console.error(err);
        }                                                             
    } 
    useEffect(() => {                 
        if(isFocused) {
            refreshClasses();     
        }
    }, [isFocused]); // set array to empty array to only run useEffect once; currently runs on every focus

    const onRefresh = useCallback(async() => { // refreshes class data when the user refreshes the screen
        setRefreshing(true);
        await refreshClasses();                // wait for the data to load before setting the refreshing state to false
        setRefreshing(false);
    }, []);

    return (
        <SafeAreaView style = {gradeStyles.container}>
            {isLoading ? (
                <View style = {{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                    <ActivityIndicator size = 'large' color = 'black' />
                </View>
            ) : (
                <ScrollView 
                    style={gradeStyles.grade_container} 
                    contentContainerStyle = {{paddingBottom: 10, marginTop: 5}}
                    refreshControl = {
                        <RefreshControl
                            refreshing = {refreshing}
                            onRefresh = {onRefresh}
                        />
                    }
                >
                    <View style = {{flexDirection: 'column', justifyContent: 'center', flex: 1}}>
                        <GradeBoxes classes = {classes} />     
                    </View>
                </ScrollView>
            )}   
        </SafeAreaView>
    );
}

const GradeBoxes = ({ classes }) => { 
    const navigation = useNavigation();
    
    let gradeObjects = classes.map((period, i) => {
        let classSummary = {                                     // creates object to be used in the array of school classes (state)
            gradeLtr: period.Marks.Mark.CalculatedScoreString, 
            gradePct: period.Marks.Mark.CalculatedScoreRaw, 
            period: period.Period, 
            teacher: period.Staff
        };
        return(
            <TouchableOpacity 
                style = {gradeStyles.grade_display}
                activeOpacity = {0.5} 
                key = {i} 
                onPress={
                    () => { 
                        navigation.navigate('Class Details', {
                            periodNumber: i,
                            classInfo: classes[i],
                    });
                }
            }>
                <View style = {{flex: 1, flexDirection: 'row', justifyContent: 'center', paddingLeft: 15, paddingRight: 15}}>
                    <Text style = {gradeStyles.grade_letter}>{classSummary.gradeLtr}</Text> 
                    <View style = {gradeStyles.vertical_line}></View>
                    <Text style = {gradeStyles.grade_info}>{`Period ${classSummary.period}: ${classSummary.teacher}`}</Text>
                </View>
            </TouchableOpacity> 
        );
    });

    return (          
        gradeObjects.map(obj => {
            return (obj);
        })
    );
}

const Assignment = ({ index, name, data, navigation }) => (
    <Pressable
            data = {data}
            onPress={() => {
                navigation.navigate('Assignment Details', {
                    index: index,
                    details: data,
                    name: name
                })
            }}
            style={({ pressed }) => [
                {
                    opacity: pressed ? 0.5 : 1,
                },
                gradeStyles.button_wrapper
            ]
        }>
        <View style = {gradeStyles.assignmentDescriptionWrapper}>
            <Text style = {{fontFamily: 'Proxima Nova Bold', fontSize: 15}}>{name}</Text>
            <Text style = {{fontFamily: 'ProximaNova-Regular', fontSize: 10, alignSelf: 'flex-end', position: 'absolute', right: 0}}>{data.Points}</Text>
        </View>
    </Pressable>   
);

const ClassDetailsScreen = ({ route, navigation }) => {
    const {periodNumber, classInfo } = route.params;
    const [isDropped, setDropped] = useState(false);

    let gradeSummary = classInfo.Marks.Mark.GradeCalculationSummary.AssignmentGradeCalc;
    let isOneWeight = !Array.isArray(gradeSummary);                                      // if there is only one weight, then the array is undefined, so we need to check for that
    let tmpTotalPct = parseFloat(classInfo.Marks.Mark.CalculatedScoreRaw).toFixed(2);    // rounds total percent to 2 decimal places

    const [categoryData, setCategoryData] = useState(isOneWeight ? tmpTotalPct : gradeSummary);
    const [totalPct, setPct] = useState(tmpTotalPct);
    
    let labels, classValues; // for the bar chart
    if(!isOneWeight) {
        labels = categoryData.map(data => {
            let words = data.Type.split(' ');
            let capitalized = '';
            if(words.length > 1) {
                for(let i=0; i<words.length-1; i++) {
                    capitalized += words[i][0].toUpperCase() + words[i].substring(1).toLowerCase() + ' '; 
                }
            }
            let lastWord = words[words.length - 1];
            capitalized += lastWord[0].toUpperCase() + lastWord.substring(1).toLowerCase();
            return capitalized;
        });

        
        classValues = categoryData.map(data => {
            return parseFloat(data.WeightedPct.substring(0, data.WeightedPct.length - 1));
        });
    } else {
        labels = ['Total'];
        classValues = [totalPct];
    } 

    const [graphData, setGraphData] = useState({ labels: labels, datasets: [{ data: classValues }, { data: [40, 40, 20, 100]}] });
    
    const assignments = classInfo.Marks.Mark.Assignments.Assignment;

    const renderItem = ({ item, index }) => {
        let name = item.Measure;
        return (
            <Assignment 
                index = {index}
                name = {name}
                data = {item}
                navigation = {navigation}
            />
        );
    }

    return (
        <SafeAreaView style={gradeStyles.container}>
            <View style={{flex: 1, flexDirection: "column", alignItems: "flex-start", marginTop: 0}}>
                <Text style={[{marginBottom: 10}, gradeStyles.info_header]}>
                    Period {parseInt(periodNumber)+1}: {classInfo.Title}
                </Text>
                <Text style={[gradeStyles.info_subheader, {marginBottom: 5}]}>
                    {totalPct}% {isDropped ? '\n' : null}
                </Text>
                <View style = {{width: '100%', height: isDropped ? 220 : 20}}>
                    <View style = {{flex: isDropped ? 1 : 0}}>
                        {/*bar graphs for weights in here*/}
                        {isDropped  
                            ? (
                                <BarChart
                                    data={graphData}
                                    width = {screenWidth - 30}
                                    height = {200}
                                    yAxisLabel = '%'
                                    chartConfig = {chartConfig}
                                />
                            ) 
                            : null
                        }
                    </View>
                    <Pressable 
                        style = {({pressed}) => [{opacity: pressed ? 0.5 : 1}, gradeStyles.dropdown_button]}
                        onPress = {() => {
                            setDropped(!isDropped); 
                        }}
                    >
                        <Image style = {[gradeStyles.image, {transform: [{rotate: isDropped ? '180deg' : '0deg'}]}]} source = {dropDownImg} />
                    </Pressable>
                </View>
                <View style={gradeStyles.horizontalDivider} />
                <View style = {{flex: 1, justifyContent: "center", width: "100%"}}>
                    <FlatList
                        data = {assignments}
                        renderItem = {(item, index) => renderItem(item, index)}
                        keyExtractor = {(item) => item.GradebookID}
                        style = {{ flex: 1, width: "100%" }}
                        extraData = {assignments}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const AssignmentDetailsScreen = ({ route, navigation }) => {
    const { details, name } = route.params;
    return (
        <View style={{ flex: 1, alignItems: "flex-start", justifyContent: "flex-start", marginLeft: 15, marginRight: 15, marginTop: 5 }}>
            <Text style = {[{marginBottom: 0}, gradeStyles.info_header]}>{name}:</Text>
            <Text style = {[gradeStyles.info_subheader, {fontSize: 15, marginTop: -2, marginBottom: 10, color: 'rgba(0, 0, 0, 0.75)'}]}>{details.Type}</Text>
            <Text style = {gradeStyles.info_subheader}>Score: {details.Points}</Text>
            <View style = {gradeStyles.horizontalDivider} />
            <AssignmentDetail detail = 'Description' data = {details.MeasureDescription === '' ? 'N/A' : details.MeasureDescription}></AssignmentDetail>
            <AssignmentDetail detail = 'Assign Date' data = {details.Date}></AssignmentDetail>
            <AssignmentDetail detail = 'Due Date' data = {details.DueDate}></AssignmentDetail>
            <AssignmentDetail detail = 'Notes' data = {details.Notes === '' ? 'N/A' : details.Notes}></AssignmentDetail>
        </View>
    )
}

const AssignmentDetail = ({detail, data}) => {
    return (
        <View style = {{width: '100%', minHeight: 30, marginTop: -10, marginBottom: 25}}>
            <Text style = {{fontFamily: 'Proxima Nova Bold', fontSize: 18}}>{detail}: </Text>
            <Text style = {{fontSize: 15, fontFamily: "ProximaNova-Regular"}}>{data}</Text>
        </View>
    ); 
}

const Stack = createStackNavigator();

function GradebookScreen(){
    return (
        <Stack.Navigator initialRouteName="GradeBook">
            <Stack.Screen name="Gradebook" component={GradebookPage} />
            <Stack.Screen name="Class Details" component={ClassDetailsScreen} />
            <Stack.Screen name="Assignment Details" component={AssignmentDetailsScreen} />
        </Stack.Navigator>
    );
}

const gradeStyles = StyleSheet.create({
    container: {
        flex: 1,
        height: "100%",
        width: "100%",
        padding: 15,
        paddingTop: 0,
        paddingBottom: 0,
    },
    image: {
        flex: 1,
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    horizontalDivider: {
        borderBottomColor: "black",
        borderBottomWidth: StyleSheet.hairlineWidth,
        width: "100%",
        marginTop: 15,
        marginBottom: 25,
    },
    vertical_line: {
        height: "70%",
        left: 100,
        alignSelf: "center",
        width: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(0,0,0,1)",
        position: "absolute"
    },
    button_wrapper: {
        minHeight: 75,
        padding: 10,
        marginBottom: 15,
        width: "100%",
        flexDirection: "column",
        justifyContent: "center",
        borderRadius: 5,
        backgroundColor: "#EAEAEA",
    },
    grade_container: {
        height: "100%",
    },
    grade_display: {
        width: "100%",
        minHeight: 80,
        padding: 5,
        marginBottom: 15,
        borderRadius: 5,
        backgroundColor: "#EAEAEA",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    grade_letter: {
        flex: 1,
        fontSize: 45,
        paddingBottom: 0,
        left: 18,
        fontFamily: "Proxima Nova Bold",
        textAlign: "left",
        textAlignVertical: "center",
    },
    grade_info: {
        flex: 4,
        fontFamily: 'ProximaNova-Regular',
        fontSize: 15,
        paddingLeft: 45,
        flexWrap: "wrap",
        justifyContent: "center",
        textAlign: "left",
        textAlignVertical: "center",
    },
    info_header: {
        fontFamily: "Proxima Nova Extrabold",
        fontSize: 25,
    },
    info_subheader: {
        fontFamily: "Proxima Nova Bold",
        fontSize: 18,
        fontWeight: "300",
        color: "rgba(0, 0, 0, 0.5)",
    },
    assignmentDescriptionWrapper: {
        flex: 1,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
    },
    dropdown_button: {
        flex: 1,
        width: "100%",
        maxHeight: 20,
        marginBottom: -5,
        alignItems: "center",
    },
});

export default GradebookScreen;